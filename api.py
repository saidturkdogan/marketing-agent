from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from core.pipeline import persist_campaign_outputs, run_campaign
from core.queue import enqueue_campaign, get_job_status

app = FastAPI(title="AI Content Factory API", version="0.2.0")


class CampaignRequest(BaseModel):
    topic: str = Field(description="The raw campaign topic or brief.")
    platforms: list[str] = Field(default_factory=list)
    outputs: list[str] = Field(default_factory=list)
    async_mode: bool = Field(default=False, description="Queue the job instead of running synchronously.")


@app.get("/health")
def healthcheck():
    return {"status": "ok"}


@app.post("/run-campaign")
def run_campaign_endpoint(request: CampaignRequest):
    if request.async_mode:
        job = enqueue_campaign(
            user_input=request.topic,
            target_platforms=request.platforms or None,
            requested_outputs=request.outputs or None,
        )
        return {"mode": "async", "job": job}

    final_state = run_campaign(
        user_input=request.topic,
        target_platforms=request.platforms or None,
        requested_outputs=request.outputs or None,
    )
    persistence = persist_campaign_outputs(final_state)
    return {
        "mode": "sync",
        "campaign_id": final_state["campaign_id"],
        "plan": final_state["plan"],
        "assets": final_state["assets"],
        "output_file": persistence["output_file"],
        "database": persistence["database"],
    }


@app.get("/job/{job_id}")
def get_job(job_id: str):
    result = get_job_status(job_id)
    if result.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Job not found.")
    return result

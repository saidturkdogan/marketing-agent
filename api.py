from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from pathlib import Path

from core.pipeline import persist_campaign_outputs, run_campaign
from core.queue import enqueue_campaign, get_job_status
from core.linkedin_token_manager import check_linkedin_token

app = FastAPI(title="AI Content Factory API", version="0.2.0")

frontend_dist_dir = Path(__file__).parent / "frontend" / "dist"
frontend_assets_dir = frontend_dist_dir / "assets"
if frontend_assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_assets_dir)), name="assets")


class CampaignRequest(BaseModel):
    topic: str = Field(description="The raw campaign topic or brief.")
    platforms: list[str] = Field(default_factory=list)
    outputs: list[str] = Field(default_factory=list)
    async_mode: bool = Field(default=False, description="Queue the job instead of running synchronously.")


@app.get("/health")
def healthcheck():
    linkedin_valid, linkedin_msg = check_linkedin_token()
    return {
        "status": "ok",
        "linkedin": {
            "configured": linkedin_valid,
            "message": linkedin_msg
        }
    }


@app.get("/")
def serve_frontend():
    """Serve the web UI built by Vite."""
    index_path = frontend_dist_dir / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return {"error": "Web UI not found. Run `npm run build --prefix frontend` first."}


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


@app.get("/api/linkedin-status")
def linkedin_status_endpoint():
    """Check LinkedIn token status"""
    is_valid, message = check_linkedin_token()
    return {
        "configured": is_valid,
        "message": message
    }


if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Starting Marketing Agent Web UI...")
    print("📱 Access at: http://localhost:8080")
    print("📚 API Docs: http://localhost:8080/docs\n")
    uvicorn.run("api:app", host="0.0.0.0", port=8080, reload=False)

"""
Async campaign worker.

Usage:
    python worker.py

Polls Redis queue "campaigns:queue", runs each campaign pipeline,
and writes results to the database and outputs/ folder.
"""
import json
import time

from core.pipeline import persist_campaign_outputs, run_campaign
from core.queue import QUEUE_KEY, _get_redis, set_job_status

POLL_INTERVAL_SECONDS = 2


def process_job(job: dict) -> None:
    job_id = job["job_id"]
    user_input = job["user_input"]
    target_platforms = job.get("target_platforms") or None
    requested_outputs = job.get("requested_outputs") or None

    print(f"[Worker]: starting job {job_id} — {user_input!r}")
    set_job_status(job_id, "running")

    try:
        final_state = run_campaign(user_input, target_platforms, requested_outputs)
        result = persist_campaign_outputs(final_state)
        set_job_status(
            job_id,
            "completed",
            {
                "campaign_id": final_state["campaign_id"],
                "output_file": result["output_file"],
                "database": result["database"],
            },
        )
        print(f"[Worker]: job {job_id} completed -> {result['output_file']}")
    except Exception as exc:
        set_job_status(job_id, "failed", {"error": str(exc)})
        print(f"[Worker]: job {job_id} FAILED — {exc}")


def main():
    print("[Worker]: starting, polling Redis queue...")
    r = _get_redis()
    if r is None:
        print("[Worker]: Redis not available. Exiting.")
        return

    while True:
        raw = r.blpop(QUEUE_KEY, timeout=POLL_INTERVAL_SECONDS)
        if raw is None:
            continue
        _, payload = raw
        try:
            job = json.loads(payload)
        except Exception:
            print(f"[Worker]: malformed job payload: {payload!r}")
            continue
        process_job(job)


if __name__ == "__main__":
    main()

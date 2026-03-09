"""
Redis-backed job queue for async campaign processing.

Architecture:
  Enqueue (API / CLI) → Redis LIST "campaigns:queue"
                      → Worker polls, runs pipeline, writes to DB + file

If Redis is not configured the module falls back to a no-op stub
so the synchronous CLI path still works without a running Redis server.
"""
from __future__ import annotations

import json
import uuid
from typing import Any

from core.config import REDIS_URL

_redis_client = None


def _get_redis():
    global _redis_client
    if _redis_client is None:
        try:
            import redis
            _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
            _redis_client.ping()
        except Exception:
            _redis_client = None
    return _redis_client


QUEUE_KEY = "campaigns:queue"
STATUS_PREFIX = "campaign:status:"


def enqueue_campaign(
    user_input: str,
    target_platforms: list[str] | None = None,
    requested_outputs: list[str] | None = None,
) -> dict[str, Any]:
    """
    Push a campaign job to the Redis queue.
    Returns a job dict with a unique job_id.
    Falls back gracefully if Redis is unavailable.
    """
    job = {
        "job_id": str(uuid.uuid4()),
        "user_input": user_input,
        "target_platforms": target_platforms or [],
        "requested_outputs": requested_outputs or [],
        "status": "queued",
    }

    r = _get_redis()
    if r is None:
        job["status"] = "no_redis"
        job["note"] = "Redis not available. Run campaign synchronously."
        return job

    r.rpush(QUEUE_KEY, json.dumps(job))
    r.setex(f"{STATUS_PREFIX}{job['job_id']}", 86400, "queued")
    return job


def get_job_status(job_id: str) -> dict[str, Any]:
    r = _get_redis()
    if r is None:
        return {"job_id": job_id, "status": "unknown", "note": "Redis not available."}

    raw = r.get(f"{STATUS_PREFIX}{job_id}")
    if raw is None:
        return {"job_id": job_id, "status": "not_found"}

    try:
        return json.loads(raw)
    except Exception:
        return {"job_id": job_id, "status": raw}


def set_job_status(job_id: str, status: str, extra: dict | None = None) -> None:
    r = _get_redis()
    if r is None:
        return

    payload: dict = {"job_id": job_id, "status": status}
    if extra:
        payload.update(extra)
    r.setex(f"{STATUS_PREFIX}{job_id}", 86400, json.dumps(payload))

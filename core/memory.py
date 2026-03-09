"""
Two-tier memory for the content factory.

Short-term  — Redis (TTL = 24 h)
  Key: memory:session:<campaign_id>
  Value: JSON snapshot of latest state fields
  Use: carry context across retries / streaming steps

Long-term   — PostgreSQL (campaigns table)
  Query: fetch N most recent campaigns filtered by topic similarity
  Use: inject relevant past learnings at campaign start

ChromaDB was removed — simple recency-based SQL retrieval is sufficient
until the campaign library grows large enough to need semantic search.
"""
from __future__ import annotations

import json
from typing import Any

from core.config import REDIS_URL

# ─── Short-term: Redis ────────────────────────────────────────────────────────

_redis = None


def _get_redis():
    global _redis
    if _redis is None:
        try:
            import redis
            _redis = redis.from_url(REDIS_URL, decode_responses=True)
            _redis.ping()
        except Exception:
            _redis = None
    return _redis


def save_session(campaign_id: str, snapshot: dict[str, Any], ttl: int = 86400) -> bool:
    r = _get_redis()
    if r is None:
        return False
    r.setex(
        f"memory:session:{campaign_id}",
        ttl,
        json.dumps(snapshot, ensure_ascii=False, default=str),
    )
    return True


def load_session(campaign_id: str) -> dict[str, Any] | None:
    r = _get_redis()
    if r is None:
        return None
    raw = r.get(f"memory:session:{campaign_id}")
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


# ─── Long-term: PostgreSQL ────────────────────────────────────────────────────

def store_campaign_knowledge(
    campaign_id: str,
    performance_score: float = 0.0,
    **_ignored: Any,
) -> bool:
    """
    Persist performance score back to the campaigns table.
    All other data is already stored by core/persistence.py.
    """
    try:
        from sqlalchemy import text
        from core.db import get_engine
        engine = get_engine()
        if engine is None:
            return False
        with engine.connect() as conn:
            conn.execute(
                text(
                    "UPDATE campaigns SET plan = jsonb_set("
                    "  plan::jsonb, '{performance_score}', :score::jsonb"
                    ") WHERE campaign_uuid = :uuid"
                ),
                {"score": json.dumps(performance_score), "uuid": campaign_id},
            )
            conn.commit()
        return True
    except Exception:
        return False


def query_similar_campaigns(topic: str, n_results: int = 3) -> list[dict[str, Any]]:
    """
    Fetch the N most recent completed campaigns from PostgreSQL.
    Simple recency-based retrieval — sufficient until the library is large.
    Production upgrade path: add pgvector for semantic similarity.
    """
    try:
        from sqlalchemy import text
        from core.db import get_engine
        engine = get_engine()
        if engine is None:
            return []
        with engine.connect() as conn:
            rows = conn.execute(
                text(
                    "SELECT campaign_uuid, user_input, plan, completed_steps, created_at "
                    "FROM campaigns "
                    "ORDER BY created_at DESC "
                    "LIMIT :n"
                ),
                {"n": n_results},
            ).fetchall()
        return [
            {
                "campaign_uuid": r[0],
                "topic": r[1],
                "plan": r[2],
                "performance_score": (r[2] or {}).get("performance_score", 0.0)
                if isinstance(r[2], dict) else 0.0,
            }
            for r in rows
        ]
    except Exception:
        return []


def build_analytics_context(topic: str) -> dict[str, Any]:
    """
    Build an analytics context dict to inject into AgentState at campaign start.
    Fetches recent past campaigns and surfaces their performance signals.
    """
    similar = query_similar_campaigns(topic, n_results=3)
    if not similar:
        return {}

    top = [
        {
            "topic": c.get("topic", ""),
            "platforms": (c.get("plan") or {}).get("target_platforms", []),
            "performance_score": c.get("performance_score", 0.0),
        }
        for c in similar
    ]
    return {
        "recent_campaigns": top,
        "note": "Use these signals to inform content angles and platform priorities.",
    }

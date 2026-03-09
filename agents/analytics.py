"""
Analytics agent.

Receives simulated or real performance metrics for a completed campaign,
extracts learnings, and updates the campaign's performance_score in ChromaDB
so future campaigns can benefit.
"""
import json

from agents.common import build_message, invoke_text_agent, to_pretty_json
from core.memory import store_campaign_knowledge
from core.state import AgentState
from prompts.agent_prompts import ANALYTICS_PROMPT


def analytics_node(state: AgentState):
    """
    Evaluate campaign performance and store improved knowledge in long-term memory.
    Called after Publisher in campaigns that have performance data available.
    """
    print("[Analytics]: analysing campaign performance...")
    assets = state.get("assets", {})
    plan = state.get("plan", {})

    # In production: pull real metrics from Google Analytics, platform APIs, etc.
    # Here we simulate reasonable mock metrics for each generated asset.
    simulated_metrics = _simulate_metrics(assets, state.get("target_platforms", []))

    analysis = invoke_text_agent(
        ANALYTICS_PROMPT,
        (
            f"Campaign topic: {state['user_input']}\n\n"
            f"Plan:\n{to_pretty_json(plan)}\n\n"
            f"Assets produced:\n{list(assets.keys())}\n\n"
            f"Performance metrics (simulated):\n{to_pretty_json(simulated_metrics)}\n\n"
            "Extract learnings and recommend improvements for future campaigns."
        ),
        temperature=0.2,
    )

    # Compute a simple performance score (0.0–1.0) from simulated metrics
    score = _compute_score(simulated_metrics)

    # Update long-term memory with performance score
    store_campaign_knowledge(
        campaign_id=state["campaign_id"],
        topic=state["user_input"],
        platforms=state.get("target_platforms", []),
        research=assets.get("research", ""),
        strategy=assets.get("strategy", {}),
        review=assets.get("review", ""),
        performance_score=score,
    )

    analytics_output = {
        "metrics": simulated_metrics,
        "score": score,
        "learnings": analysis,
    }

    return {
        "messages": build_message("Analytics", to_pretty_json(analytics_output)),
        "assets": {"analytics": analytics_output},
        "completed_steps": ["Analytics"],
    }


def _simulate_metrics(assets: dict, platforms: list[str]) -> dict:
    """
    Simulate engagement metrics for each platform asset.
    Production: replace with real API calls.
    """
    import random
    random.seed(abs(hash(str(assets)[:100])))

    metrics: dict = {}
    for platform in platforms:
        metrics[platform] = {
            "impressions": random.randint(1000, 50000),
            "engagements": random.randint(50, 5000),
            "ctr": round(random.uniform(0.01, 0.12), 3),
            "saves": random.randint(10, 500),
        }

    if assets.get("blog_post"):
        metrics["blog"] = {
            "page_views": random.randint(100, 10000),
            "avg_read_time_seconds": random.randint(60, 420),
            "bounce_rate": round(random.uniform(0.3, 0.8), 2),
        }

    if assets.get("video_script"):
        metrics["video"] = {
            "views": random.randint(500, 100000),
            "watch_time_seconds": random.randint(30, 300),
            "likes": random.randint(10, 5000),
        }

    return metrics


def _compute_score(metrics: dict) -> float:
    """Simple 0.0–1.0 score from average CTR across platforms."""
    ctrs = [v.get("ctr", 0) for v in metrics.values() if isinstance(v, dict) and "ctr" in v]
    if not ctrs:
        return 0.5
    avg_ctr = sum(ctrs) / len(ctrs)
    return round(min(avg_ctr / 0.12, 1.0), 3)

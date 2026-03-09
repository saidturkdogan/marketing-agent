import json
import os
from uuid import uuid4

from langchain_core.messages import HumanMessage

from core.engine import build_marketing_team_graph
from core.memory import build_analytics_context, save_session, store_campaign_knowledge
from core.persistence import persist_campaign

DEFAULT_PLATFORMS = ["Instagram", "LinkedIn", "TikTok", "Twitter"]
DEFAULT_OUTPUTS = ["blog", "social", "video", "images"]


def build_initial_state(
    user_input: str,
    target_platforms: list[str] | None = None,
    requested_outputs: list[str] | None = None,
):
    campaign_id = str(uuid4())
    analytics_context = build_analytics_context(user_input)

    state = {
        "messages": [HumanMessage(content=user_input)],
        "user_input": user_input,
        "campaign_id": campaign_id,
        "next": "",
        "target_platforms": target_platforms or DEFAULT_PLATFORMS,
        "requested_outputs": requested_outputs or DEFAULT_OUTPUTS,
        "completed_steps": [],
        "execution_queue": [],
        "parallel_groups": [],
        "plan": {},
        "assets": {},
        "analytics_context": analytics_context,
    }
    save_session(campaign_id, {"user_input": user_input, "status": "started"})
    return state


def run_campaign(user_input: str, target_platforms: list[str] | None = None, requested_outputs: list[str] | None = None):
    graph = build_marketing_team_graph()
    initial_state = build_initial_state(user_input, target_platforms, requested_outputs)
    return graph.invoke(initial_state, {"recursion_limit": 60})


def stream_campaign(user_input: str, target_platforms: list[str] | None = None, requested_outputs: list[str] | None = None):
    graph = build_marketing_team_graph()
    initial_state = build_initial_state(user_input, target_platforms, requested_outputs)
    return graph.stream(initial_state, {"recursion_limit": 60})


def save_campaign_outputs(final_state: dict, output_dir: str = "outputs") -> str:
    os.makedirs(output_dir, exist_ok=True)

    safe_topic = "".join(
        char if char.isalnum() else "_" for char in final_state["user_input"][:40]
    ).strip("_")
    file_path = os.path.join(
        output_dir,
        f"{safe_topic}_{final_state['campaign_id'][:8]}.json",
    )

    serializable_state = {
        "campaign_id": final_state["campaign_id"],
        "user_input": final_state["user_input"],
        "target_platforms": final_state["target_platforms"],
        "requested_outputs": final_state["requested_outputs"],
        "plan": final_state["plan"],
        "assets": final_state["assets"],
        "completed_steps": final_state["completed_steps"],
    }

    with open(file_path, "w", encoding="utf-8") as handle:
        json.dump(serializable_state, handle, ensure_ascii=False, indent=2)

    return file_path


def persist_campaign_outputs(final_state: dict, output_dir: str = "outputs") -> dict:
    output_file = save_campaign_outputs(final_state, output_dir=output_dir)
    database = persist_campaign(final_state)

    # Store knowledge in long-term memory for future campaigns
    assets = final_state.get("assets", {})
    store_campaign_knowledge(
        campaign_id=final_state["campaign_id"],
        topic=final_state["user_input"],
        platforms=final_state.get("target_platforms", []),
        research=assets.get("research", ""),
        strategy=assets.get("strategy", {}),
        review=assets.get("review", ""),
    )

    # Update session in short-term memory
    save_session(
        final_state["campaign_id"],
        {"user_input": final_state["user_input"], "status": "completed"},
    )

    return {
        "output_file": output_file,
        "database": database,
    }

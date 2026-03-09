import json

from agents.common import build_message, invoke_text_agent, to_pretty_json
from core.state import AgentState
from prompts.agent_prompts import PUBLISHER_PROMPT
from tools.publisher_tools import (
    publish_to_instagram,
    publish_to_linkedin,
    publish_to_twitter,
    publish_to_wordpress,
)

PLATFORM_TOOL_MAP = {
    "Twitter": publish_to_twitter,
    "LinkedIn": publish_to_linkedin,
    "Instagram": publish_to_instagram,
}


def publisher_node(state: AgentState):
    """
    Prepares and dispatches each platform asset to the appropriate API tool.
    Results (ready / skipped / error) are stored in assets['publish_manifest'].
    """
    print("[Publisher]: preparing publish manifest...")
    assets = state.get("assets", {})
    campaign_id = state["campaign_id"]
    manifest: dict = {}

    # Social platforms
    for platform, content in assets.get("social", {}).items():
        tool_fn = PLATFORM_TOOL_MAP.get(platform)
        if tool_fn:
            result = tool_fn.invoke({"content": content, "campaign_id": campaign_id})
            try:
                manifest[platform] = json.loads(result)
            except Exception:
                manifest[platform] = {"status": "error", "raw": result}

    # Blog → WordPress
    blog_post = assets.get("blog_post", "")
    if blog_post:
        strategy = assets.get("strategy", {})
        title = strategy.get("campaign_title", state["user_input"]) if isinstance(strategy, dict) else state["user_input"]
        result = publish_to_wordpress.invoke(
            {"title": title, "content": blog_post, "campaign_id": campaign_id}
        )
        try:
            manifest["WordPress"] = json.loads(result)
        except Exception:
            manifest["WordPress"] = {"status": "error", "raw": result}

    # LLM validates the manifest and flags any blockers
    validation = invoke_text_agent(
        PUBLISHER_PROMPT,
        (
            f"Campaign: {state['user_input']}\n\n"
            f"Publish manifest:\n{to_pretty_json(manifest)}"
        ),
        temperature=0.1,
    )

    manifest["validation_notes"] = validation

    return {
        "messages": build_message("Publisher", to_pretty_json(manifest)),
        "assets": {"publish_manifest": manifest},
        "completed_steps": ["Publisher"],
    }

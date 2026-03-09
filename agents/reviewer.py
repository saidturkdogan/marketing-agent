from agents.common import build_message, invoke_text_agent, to_pretty_json
from core.state import AgentState
from prompts.agent_prompts import REVIEWER_PROMPT
from tools.analytics import check_content_policy


def reviewer_node(state: AgentState):
    """Review the assembled campaign before publish."""
    print("[Reviewer]: evaluating campaign output...")
    assets = state.get("assets", {})
    policy_checks: dict = {}

    if assets.get("blog_post"):
        policy_checks["blog_post"] = check_content_policy.invoke(
            {"text": assets["blog_post"][:4000]}
        )
    for platform, content in assets.get("social", {}).items():
        policy_checks[f"social_{platform.lower()}"] = check_content_policy.invoke(
            {"text": content[:4000]}
        )
    if assets.get("video_script"):
        policy_checks["video_script"] = check_content_policy.invoke(
            {"text": assets["video_script"][:4000]}
        )

    review = invoke_text_agent(
        REVIEWER_PROMPT,
        (
            f"Topic: {state['user_input']}\n\n"
            f"Plan:\n{to_pretty_json(state.get('plan', {}))}\n\n"
            f"Assets:\n{to_pretty_json(assets)}\n\n"
            f"Policy checks:\n{to_pretty_json(policy_checks)}"
        ),
        temperature=0.1,
    )

    return {
        "messages": build_message("Reviewer", review),
        "assets": {"review": review},
        "completed_steps": ["Reviewer"],
    }

from agents.common import build_message, invoke_text_agent
from core.state import AgentState
from prompts.agent_prompts import VIDEO_SCRIPT_PROMPT


def video_script_writer_node(state: AgentState):
    print("[VideoScriptWriter]: creating long-form video script...")
    assets = state.get("assets", {})
    strategy = assets.get("strategy", {})
    research = assets.get("research", "")
    trend_report = assets.get("trend_report", "")
    blog_post = assets.get("blog_post", "")

    script = invoke_text_agent(
        VIDEO_SCRIPT_PROMPT,
        (
            f"Topic: {state['user_input']}\n\n"
            f"Strategy:\n{strategy}\n\n"
            f"Research:\n{research}\n\n"
            f"Trend signals:\n{trend_report}\n\n"
            f"Blog draft for reuse:\n{blog_post}"
        ),
        temperature=0.5,
    )

    return {
        "messages": build_message("VideoScriptWriter", script),
        "assets": {"video_script": script},
        "completed_steps": ["VideoScriptWriter"],
    }

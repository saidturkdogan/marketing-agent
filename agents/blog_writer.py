from agents.common import build_message, invoke_text_agent
from core.state import AgentState
from prompts.agent_prompts import BLOG_WRITER_PROMPT
from tools.analytics import get_seo_keywords


def blog_writer_node(state: AgentState):
    print("[BlogWriter]: drafting blog asset...")
    assets = state.get("assets", {})
    strategy = assets.get("strategy", {})
    research = assets.get("research", "")
    trend_report = assets.get("trend_report", "")
    seo_keywords = get_seo_keywords.invoke({"topic": state["user_input"]})

    blog_post = invoke_text_agent(
        BLOG_WRITER_PROMPT,
        (
            f"Topic: {state['user_input']}\n\n"
            f"Strategy:\n{strategy}\n\n"
            f"Research:\n{research}\n\n"
            f"Trend signals:\n{trend_report}\n\n"
            f"SEO keyword guidance:\n{seo_keywords}\n\n"
            "Return markdown only."
        ),
        temperature=0.5,
    )

    return {
        "messages": build_message("BlogWriter", blog_post),
        "assets": {"blog_post": blog_post},
        "completed_steps": ["BlogWriter"],
    }

from agents.common import build_message, invoke_text_agent
from core.state import AgentState
from prompts.agent_prompts import TIKTOK_WRITER_PROMPT
from tools.analytics import get_seo_keywords
from tools.platform_tools import get_platform_specs, get_trending_sounds


def tiktok_writer_node(state: AgentState):
    print("[TikTokWriter]: building TikTok content package...")
    assets = state.get("assets", {})
    strategy = assets.get("strategy", {})
    research = assets.get("research", "")
    trend_report = assets.get("trend_report", "")
    specs = get_platform_specs.invoke({"platform": "tiktok"})
    sounds = get_trending_sounds.invoke({"topic": state["user_input"]})
    seo_keywords = get_seo_keywords.invoke({"topic": state["user_input"]})

    content = invoke_text_agent(
        TIKTOK_WRITER_PROMPT,
        (
            f"Topic: {state['user_input']}\n\n"
            f"Strategy:\n{strategy}\n\n"
            f"Research:\n{research}\n\n"
            f"Trend signals:\n{trend_report}\n\n"
            f"TikTok specs:\n{specs}\n\n"
            f"Trending sounds:\n{sounds}\n\n"
            f"Keyword cues:\n{seo_keywords}"
        ),
        temperature=0.75,
    )

    return {
        "messages": build_message("TikTokWriter", content),
        "assets": {"social": {"TikTok": content}},
        "completed_steps": ["TikTokWriter"],
    }

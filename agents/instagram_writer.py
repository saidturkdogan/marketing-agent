from agents.common import build_message, invoke_text_agent
from core.state import AgentState
from prompts.agent_prompts import INSTAGRAM_WRITER_PROMPT
from tools.platform_tools import get_instagram_hashtags, get_platform_specs


def instagram_writer_node(state: AgentState):
    print("[InstagramWriter]: building Instagram content package...")
    assets = state.get("assets", {})
    strategy = assets.get("strategy", {})
    research = assets.get("research", "")
    trend_report = assets.get("trend_report", "")
    hashtags = get_instagram_hashtags.invoke({"topic": state["user_input"]})
    specs = get_platform_specs.invoke({"platform": "instagram"})

    content = invoke_text_agent(
        INSTAGRAM_WRITER_PROMPT,
        (
            f"Topic: {state['user_input']}\n\n"
            f"Strategy:\n{strategy}\n\n"
            f"Research:\n{research}\n\n"
            f"Trend signals:\n{trend_report}\n\n"
            f"Instagram specs:\n{specs}\n\n"
            f"Hashtag research:\n{hashtags}"
        ),
        temperature=0.7,
    )

    return {
        "messages": build_message("InstagramWriter", content),
        "assets": {"social": {"Instagram": content}},
        "completed_steps": ["InstagramWriter"],
    }

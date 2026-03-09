from agents.common import build_message, invoke_text_agent, to_pretty_json
from core.state import AgentState
from prompts.agent_prompts import TREND_DETECTOR_PROMPT
from tools.search import get_search_tool
from tools.trends import get_google_trends, get_reddit_trends, get_twitter_trends


def trend_detector_node(state: AgentState):
    print("[TrendDetector]: scanning trend signals...")
    search_tool = get_search_tool()[0]

    # Run multiple trend signal queries in parallel via the search tool
    trend_query = f"{state['user_input']} trending 2025"
    search_results = search_tool.invoke(trend_query)

    # Collect structured signals from mock trend tools
    google_trends = get_google_trends.invoke({"topic": state["user_input"]})
    reddit_trends = get_reddit_trends.invoke({"topic": state["user_input"]})
    twitter_trends = get_twitter_trends.invoke({"topic": state["user_input"]})

    trend_report = invoke_text_agent(
        TREND_DETECTOR_PROMPT,
        (
            f"Topic: {state['user_input']}\n\n"
            f"Search results:\n{search_results}\n\n"
            f"Google Trends:\n{google_trends}\n\n"
            f"Reddit signals:\n{reddit_trends}\n\n"
            f"Twitter/X signals:\n{twitter_trends}"
        ),
        temperature=0.2,
    )

    return {
        "messages": build_message("TrendDetector", trend_report),
        "assets": {"trend_report": trend_report},
        "completed_steps": ["TrendDetector"],
    }

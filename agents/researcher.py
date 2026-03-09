from agents.common import build_message, invoke_text_agent
from core.state import AgentState
from prompts.agent_prompts import RESEARCHER_PROMPT
from tools.search import get_search_tool


def researcher_node(state: AgentState):
    """Build a reusable research brief from live search results."""
    print("[Researcher]: collecting search-based market signals...")
    search_tool = get_search_tool()[0]
    search_results = search_tool.invoke(state["user_input"])
    plan = state.get("plan", {})

    brief = invoke_text_agent(
        RESEARCHER_PROMPT,
        (
            f"Topic: {state['user_input']}\n\n"
            f"Planner context: {plan}\n\n"
            f"Raw search results:\n{search_results}\n\n"
            "Write a compact research brief with sections for market angle, competitors, keywords, "
            "and platform-specific content opportunities."
        ),
        temperature=0.2,
    )

    return {
        "messages": build_message("Researcher", brief),
        "assets": {"research": brief},
        "completed_steps": ["Researcher"],
    }

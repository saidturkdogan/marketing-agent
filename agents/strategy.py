from pydantic import BaseModel, Field

from agents.common import build_message, to_pretty_json
from core.llm import get_llm
from core.state import AgentState
from prompts.agent_prompts import STRATEGY_PROMPT


class StrategyOutput(BaseModel):
    campaign_title: str = Field(description="Human-readable campaign title.")
    audience: str = Field(description="Primary audience.")
    positioning: str = Field(description="Brand or campaign positioning.")
    content_pillars: list[str] = Field(description="3-5 content pillars.")
    call_to_action: str = Field(description="Primary CTA.")
    platform_hooks: dict[str, str] = Field(description="Per-platform hook direction.")
    repurposing_notes: list[str] = Field(description="How to reuse core ideas across assets.")
    trend_angles: list[str] = Field(
        default_factory=list,
        description="Trend-informed angles from TrendDetector to incorporate.",
    )


def strategist_node(state: AgentState):
    planner = state.get("plan", {})
    assets = state.get("assets", {})
    research = assets.get("research", "")
    trend_report = assets.get("trend_report", "")
    analytics_context = state.get("analytics_context") or {}

    analytics_hint = (
        f"\n\nPast performance learnings:\n{to_pretty_json(analytics_context)}"
        if analytics_context
        else ""
    )

    llm = get_llm(temperature=0.3).with_structured_output(StrategyOutput)
    strategy = llm.invoke(
        [
            ("system", STRATEGY_PROMPT),
            (
                "human",
                (
                    f"Topic: {state['user_input']}\n\n"
                    f"Planner output:\n{to_pretty_json(planner)}\n\n"
                    f"Research brief:\n{research}\n\n"
                    f"Trend report:\n{trend_report}"
                    f"{analytics_hint}"
                ),
            ),
        ]
    ).model_dump()

    return {
        "messages": build_message("Strategist", to_pretty_json(strategy)),
        "assets": {"strategy": strategy},
        "completed_steps": ["Strategist"],
    }

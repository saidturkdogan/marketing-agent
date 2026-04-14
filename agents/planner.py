from typing import Literal

from pydantic import BaseModel, Field

from agents.common import build_message, to_pretty_json
from core.llm import get_llm
from core.state import AgentState
from prompts.agent_prompts import PLANNER_PROMPT

PLATFORM_TO_STEP = {
    "Instagram": "InstagramWriter",
    "LinkedIn": "LinkedInWriter",
    "TikTok": "TikTokWriter",
    "Twitter": "TwitterWriter",
}

DEFAULT_OUTPUTS = ["blog", "social", "video", "images"]


class CampaignPlan(BaseModel):
    goal: str = Field(description="Primary campaign goal.")
    audience: str = Field(description="Primary audience segment.")
    core_angle: str = Field(description="Single sharp angle for the campaign.")
    key_points: list[str] = Field(description="3-5 points that all assets should reuse.")
    include_blog: bool = True
    include_video_script: bool = True
    include_image_prompts: bool = True
    include_trend_detection: bool = True
    target_platforms: list[Literal["Instagram", "LinkedIn", "TikTok", "Twitter"]] = Field(
        default_factory=list
    )


def build_execution_plan(plan: dict, target_platforms: list[str]) -> tuple[list[str], list[list[str]]]:
    """
    Returns:
        queue          – ordered sequential steps (Supervisor pops these one by one)
        parallel_groups – groups of steps that can run simultaneously after Strategist
    """
    # Sequential bootstrap
    sequential_pre = ["Researcher"]
    if plan.get("include_trend_detection", True):
        sequential_pre.append("TrendDetector")
    sequential_pre.append("Strategist")

    # Parallel content writers
    parallel_writers: list[str] = []
    if plan.get("include_blog", True):
        parallel_writers.append("BlogWriter")
    for platform in target_platforms:
        step = PLATFORM_TO_STEP.get(platform)
        if step:
            parallel_writers.append(step)
    if plan.get("include_video_script", True):
        parallel_writers.append("VideoScriptWriter")
    if plan.get("include_image_prompts", True):
        parallel_writers.append("ImagePromptWriter")

    # Sequential finisher
    sequential_post = ["Reviewer", "Publisher", "Analytics"]

    queue = sequential_pre + ["PARALLEL"] + sequential_post
    return queue, [parallel_writers]


def planner_node(state: AgentState):
    requested_outputs = state.get("requested_outputs") or DEFAULT_OUTPUTS
    requested_platforms = state.get("target_platforms") or list(PLATFORM_TO_STEP.keys())
    analytics_ctx = state.get("analytics_context") or {}

    # Build analytics hint
    analytics_hint = ""
    if analytics_ctx:
        analytics_hint = f"\n\nPast performance signals:\n{to_pretty_json(analytics_ctx)}"
    
    # Add RAG context if available (semantically similar campaigns)
    rag_context = ""
    if analytics_ctx.get("recent_campaigns"):
        recent = analytics_ctx["recent_campaigns"]
        rag_context = "\n\n📚 SIMILAR PAST CAMPAIGNS (from RAG knowledge base):\n"
        for i, camp in enumerate(recent, 1):
            relevance = camp.get("relevance", 0)
            score = camp.get("performance_score", 0)
            rag_context += f"\n{i}. Topic: {camp.get('topic', 'N/A')}"
            rag_context += f"\n   Relevance: {relevance:.1%}"
            rag_context += f"\n   Performance: {score:.1%}"
            if camp.get("preview"):
                rag_context += f"\n   Preview: {camp['preview'][:150]}"
            rag_context += "\n"
        
        # Add RAG-specific instruction
        if analytics_ctx.get("rag_enabled"):
            rag_context += "\n💡 These campaigns were found using semantic similarity (RAG)."
            rag_context += "\nLeverage their successful patterns and avoid their mistakes."

    llm = get_llm(temperature=0.2).with_structured_output(CampaignPlan)
    plan = llm.invoke(
        [
            ("system", PLANNER_PROMPT),
            (
                "human",
                (
                    f"Topic: {state['user_input']}\n"
                    f"Requested outputs: {requested_outputs}\n"
                    f"Requested platforms: {requested_platforms}\n"
                    "Respect the requested platforms unless there is a strong reason to narrow them."
                    f"{analytics_hint}"
                    f"{rag_context}"
                ),
            ),
        ]
    ).model_dump()

    target_platforms = plan.get("target_platforms") or requested_platforms
    plan["target_platforms"] = target_platforms
    execution_queue, parallel_groups = build_execution_plan(plan, target_platforms)

    return {
        "messages": build_message("Planner", to_pretty_json(plan)),
        "plan": plan,
        "assets": {"planner": plan},
        "target_platforms": target_platforms,
        "execution_queue": execution_queue,
        "parallel_groups": parallel_groups,
        "completed_steps": ["Planner"],
    }

from typing import Literal
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage

from core.state import AgentState
from core.llm import get_llm
from prompts.agent_prompts import SUPERVISOR_PROMPT


# Map platform names to their writer agent names
PLATFORM_TO_WRITER = {
    "Instagram": "InstagramWriter",
    "LinkedIn": "LinkedInWriter",
    "TikTok": "TikTokWriter",
    "Twitter": "TwitterWriter",
}

ALL_PLATFORMS = ["Instagram", "LinkedIn", "TikTok", "Twitter"]


class RouteResponse(BaseModel):
    """Structured output for the Supervisor's routing decision."""
    next: Literal[
        "Researcher", 
        "InstagramWriter", 
        "LinkedInWriter", 
        "TikTokWriter", 
        "TwitterWriter", 
        "Reviewer", 
        "FINISH"
    ] = Field(
        description="Who is the agent to be assigned next? Or 'FINISH' if the task is completely done."
    )
    
    target_platforms: list[str] = Field(
        default_factory=lambda: ALL_PLATFORMS,
        description="Which platforms to create content for. E.g. ['Instagram', 'LinkedIn', 'TikTok', 'Twitter']"
    )


def supervisor_node(state: AgentState):
    """
    The Supervisor reviews the conversation history and decides:
    1. Which agent to route to next
    2. Which platforms to target (on first run)
    
    It uses a combination of LLM decision-making and deterministic logic
    to ensure all target platforms get their content created before review.
    """
    print("👔 [Manager Evaluation]: Supervisor is reviewing the current state and making assignments...")
    
    messages = state["messages"]
    target_platforms = state.get("target_platforms", [])
    completed_platforms = state.get("completed_platforms", [])
    
    # Build context about platform progress for the LLM
    platform_context = ""
    if target_platforms:
        platform_context += f"\n\nCURRENT PLATFORM STATUS:"
        platform_context += f"\nTarget platforms: {target_platforms}"
        platform_context += f"\nCompleted platforms: {completed_platforms}"
        remaining = [p for p in target_platforms if p not in completed_platforms]
        platform_context += f"\nRemaining platforms: {remaining}"
        if remaining:
            next_writer = PLATFORM_TO_WRITER.get(remaining[0], "")
            platform_context += f"\nNext platform writer to assign: {next_writer}"
    
    system_message = SystemMessage(content=SUPERVISOR_PROMPT + platform_context)
    
    llm = get_llm(temperature=0.1)
    structured_llm = llm.with_structured_output(RouteResponse)
    
    response = structured_llm.invoke([system_message] + messages)
    
    # On first call, set target platforms from LLM response
    if not target_platforms:
        target_platforms = response.target_platforms if response.target_platforms else ALL_PLATFORMS
    
    # Deterministic override: if there are remaining platforms and LLM tries to go to Reviewer/FINISH,
    # force it to the next uncompleted platform writer instead
    remaining = [p for p in target_platforms if p not in completed_platforms]
    
    next_agent = response.next
    
    # If research is done and we have remaining platforms, route to the next writer
    if next_agent in ("Reviewer", "FINISH") and remaining:
        # Check if the last message was from Researcher (meaning we haven't started writing yet)
        # or if there are still platforms to complete
        next_platform = remaining[0]
        next_agent = PLATFORM_TO_WRITER.get(next_platform, next_agent)
        print(f"   📋 Override: Routing to {next_agent} (remaining: {remaining})")
    
    print(f"   ➡️  Decision: {next_agent}")
    
    result = {"next": next_agent, "target_platforms": target_platforms}
    
    # Only include completed_platforms if it hasn't been set yet
    if not state.get("completed_platforms"):
        result["completed_platforms"] = []
    
    return result

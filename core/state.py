from typing import Annotated, Sequence, TypedDict
import operator
from langchain_core.messages import BaseMessage

class AgentState(TypedDict):
    """
    The state of the system. Used to pass data between agents in the LangGraph flow.
    Every time an agent runs, a new message is added to the 'messages' list.
    The 'next' field determines which agent the Supervisor hands off to next.
    target_platforms tracks which platforms the user wants content for.
    completed_platforms tracks which platform writers have finished their work.
    """
    # Message history - operator.add appends new messages to the list instead of overwriting
    messages: Annotated[Sequence[BaseMessage], operator.add]
    
    # The name of the next agent to be called
    next: str
    
    # Which platforms the user wants content for (e.g. ["Instagram", "LinkedIn", "TikTok", "Twitter"])
    target_platforms: list[str]
    
    # Which platform writers have already completed their work
    completed_platforms: list[str]

from core.state import AgentState
from core.llm import get_llm
from prompts.agent_prompts import REVIEWER_PROMPT
from langgraph.prebuilt import create_react_agent
from tools.analytics import check_content_policy
from tools.platform_tools import get_platform_specs
from langchain_core.messages import AIMessage


def create_reviewer_agent():
    """
    Creates the platform-aware Quality Assurance / Editor agent.
    Now reviews content against platform-specific standards for each social media channel.
    """
    llm = get_llm(temperature=0.1)  # Extremely low temp for analytical thinking
    
    tools = [check_content_policy, get_platform_specs]
    
    reviewer_agent = create_react_agent(
        llm, 
        tools=tools,  
        prompt=REVIEWER_PROMPT
    )
    return reviewer_agent


def reviewer_node(state: AgentState):
    """
    The 'Reviewer' node within LangGraph.
    Reviews ALL platform content against platform-specific quality standards.
    Uses content policy checks and platform specs for thorough QA.
    """
    platforms = state.get("target_platforms", [])
    print(f"🧐 [Agent Working]: Reviewer is checking content for platforms: {', '.join(platforms)}...")
    
    agent = create_reviewer_agent()
    result = agent.invoke({"messages": state["messages"]})
    
    last_msg = result["messages"][-1].content
    if isinstance(last_msg, list):
        last_msg = "\n".join([item.get("text", "") for item in last_msg if isinstance(item, dict) and "text" in item])
        
    return {
        "messages": [AIMessage(content=last_msg, name="Reviewer")]
    }

from core.state import AgentState
from core.llm import get_llm
from prompts.agent_prompts import LINKEDIN_WRITER_PROMPT
from langgraph.prebuilt import create_react_agent
from tools.analytics import get_seo_keywords, check_content_policy
from tools.platform_tools import get_platform_specs
from langchain_core.messages import AIMessage


def create_linkedin_writer_agent():
    """
    LinkedIn Writer agent.
    Specializes in creating professional, thought-leadership LinkedIn content:
    posts, article outlines, carousel outlines, and polls.
    """
    llm = get_llm(temperature=0.6)  # Slightly lower temp for more professional tone
    
    tools = [get_seo_keywords, get_platform_specs, check_content_policy]
    
    linkedin_agent = create_react_agent(
        llm, 
        tools=tools,  
        prompt=LINKEDIN_WRITER_PROMPT
    )
    return linkedin_agent


def linkedin_writer_node(state: AgentState):
    """
    The 'LinkedInWriter' node within LangGraph.
    Creates LinkedIn-optimized professional content based on the Researcher's data.
    """
    print("💼 [Agent Working]: LinkedIn Writer is crafting professional thought-leadership content...")
    agent = create_linkedin_writer_agent()
    result = agent.invoke({"messages": state["messages"]})
    
    last_msg = result["messages"][-1].content
    if isinstance(last_msg, list):
        last_msg = "\n".join([item.get("text", "") for item in last_msg if isinstance(item, dict) and "text" in item])
        
    # Track this platform as completed
    completed = list(state.get("completed_platforms", []))
    if "LinkedIn" not in completed:
        completed.append("LinkedIn")
    
    return {
        "messages": [AIMessage(content=last_msg, name="LinkedInWriter")],
        "completed_platforms": completed
    }

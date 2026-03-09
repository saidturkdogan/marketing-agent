from core.state import AgentState
from core.llm import get_llm
from prompts.agent_prompts import TIKTOK_WRITER_PROMPT
from langgraph.prebuilt import create_react_agent
from tools.analytics import get_seo_keywords
from tools.platform_tools import get_trending_sounds, get_platform_specs
from langchain_core.messages import AIMessage


def create_tiktok_writer_agent():
    """
    TikTok Writer agent.
    Specializes in creating viral TikTok content: video scripts with timestamps,
    hook optimization, trending sound suggestions, and caption + hashtag combos.
    """
    llm = get_llm(temperature=0.8)  # Higher temp for creative, trendy Gen-Z tone
    
    tools = [get_seo_keywords, get_trending_sounds, get_platform_specs]
    
    tiktok_agent = create_react_agent(
        llm, 
        tools=tools,  
        prompt=TIKTOK_WRITER_PROMPT
    )
    return tiktok_agent


def tiktok_writer_node(state: AgentState):
    """
    The 'TikTokWriter' node within LangGraph.
    Creates TikTok-optimized viral video scripts based on the Researcher's data.
    """
    print("🎵 [Agent Working]: TikTok Writer is scripting viral hooks and trend-aware content...")
    agent = create_tiktok_writer_agent()
    result = agent.invoke({"messages": state["messages"]})
    
    last_msg = result["messages"][-1].content
    if isinstance(last_msg, list):
        last_msg = "\n".join([item.get("text", "") for item in last_msg if isinstance(item, dict) and "text" in item])
        
    # Track this platform as completed
    completed = list(state.get("completed_platforms", []))
    if "TikTok" not in completed:
        completed.append("TikTok")
    
    return {
        "messages": [AIMessage(content=last_msg, name="TikTokWriter")],
        "completed_platforms": completed
    }

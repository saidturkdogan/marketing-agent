from core.state import AgentState
from core.llm import get_llm
from prompts.agent_prompts import INSTAGRAM_WRITER_PROMPT
from langgraph.prebuilt import create_react_agent
from tools.analytics import get_seo_keywords
from tools.platform_tools import get_instagram_hashtags, get_platform_specs
from langchain_core.messages import AIMessage


def create_instagram_writer_agent():
    """
    Instagram Writer agent.
    Specializes in creating Instagram-specific content: captions, hashtags, reels, carousels.
    Has access to Instagram hashtag research and platform specs tools.
    """
    llm = get_llm(temperature=0.7)
    
    tools = [get_seo_keywords, get_instagram_hashtags, get_platform_specs]
    
    instagram_agent = create_react_agent(
        llm, 
        tools=tools,  
        prompt=INSTAGRAM_WRITER_PROMPT
    )
    return instagram_agent


def instagram_writer_node(state: AgentState):
    """
    The 'InstagramWriter' node within LangGraph.
    Creates Instagram-optimized content based on the Researcher's data.
    """
    print("📸 [Agent Working]: Instagram Writer is crafting scroll-stopping content...")
    agent = create_instagram_writer_agent()
    result = agent.invoke({"messages": state["messages"]})
    
    last_msg = result["messages"][-1].content
    if isinstance(last_msg, list):
        last_msg = "\n".join([item.get("text", "") for item in last_msg if isinstance(item, dict) and "text" in item])
        
    # Track this platform as completed
    completed = list(state.get("completed_platforms", []))
    if "Instagram" not in completed:
        completed.append("Instagram")
    
    return {
        "messages": [AIMessage(content=last_msg, name="InstagramWriter")],
        "completed_platforms": completed
    }

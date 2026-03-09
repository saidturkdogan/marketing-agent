from langchain_core.messages import SystemMessage
from core.state import AgentState
from core.llm import get_llm
from prompts.agent_prompts import RESEARCHER_PROMPT
from tools.search import get_search_tool
from langgraph.prebuilt import create_react_agent

def create_researcher_agent():
    """
    Creates the researcher agent.
    create_react_agent gives it the ability to both make decisions and use search tools.
    """
    llm = get_llm(temperature=0.2) # Lower temperature for a more precise and analytical approach
    tools = get_search_tool()      # Authorized to search the internet
    
    # The agent is defined using Langchain's ReAct (Reason and Act) loop
    researcher_agent = create_react_agent(
        llm, 
        tools=tools, 
        prompt=RESEARCHER_PROMPT
    )
    return researcher_agent

from langchain_core.messages import AIMessage, HumanMessage

def researcher_node(state: AgentState):
    """
    The 'Researcher' node within LangGraph.
    Sends the current conversation history (messages) to the agent, and saves the agent's response to the state.
    """
    print("🔎 [Agent Working]: Researcher is scanning and analyzing the internet...")
    agent = create_researcher_agent()
    result = agent.invoke({"messages": state["messages"]})
    
    # Extract the last message content
    last_msg = result["messages"][-1].content
    if isinstance(last_msg, list):
        last_msg = "\n".join([item.get("text", "") for item in last_msg if isinstance(item, dict) and "text" in item])
        
    return {
        "messages": [AIMessage(content=last_msg, name="Researcher")]
    }

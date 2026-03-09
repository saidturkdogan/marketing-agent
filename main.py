import os
from dotenv import load_dotenv

# required modules for LangGraph flow design
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import HumanMessage

# Project components
from core.state import AgentState
from core.config import GOOGLE_API_KEY
from agents.researcher import researcher_node
from agents.instagram_writer import instagram_writer_node
from agents.linkedin_writer import linkedin_writer_node
from agents.tiktok_writer import tiktok_writer_node
from agents.twitter_writer import twitter_writer_node
from agents.reviewer import reviewer_node
from agents.supervisor import supervisor_node

def build_marketing_team_graph():
    """
    Builds the Communication Flow (Graph) of the Multi-Agent System.
    
    Flow:
    User → Supervisor → Researcher → Supervisor → [Platform Writers] → Supervisor → Reviewer → FINISH
    
    Platform Writers:
    - InstagramWriter: Creates Instagram-specific content
    - LinkedInWriter: Creates LinkedIn-specific content
    - TikTokWriter: Creates TikTok-specific content
    - TwitterWriter: Creates Twitter/X-specific content
    """
    # 1. Place the State object at the core
    builder = StateGraph(AgentState)
    
    # 2. Add all agents as Nodes
    builder.add_node("Supervisor", supervisor_node)
    builder.add_node("Researcher", researcher_node)
    builder.add_node("InstagramWriter", instagram_writer_node)
    builder.add_node("LinkedInWriter", linkedin_writer_node)
    builder.add_node("TikTokWriter", tiktok_writer_node)
    builder.add_node("TwitterWriter", twitter_writer_node)
    builder.add_node("Reviewer", reviewer_node)
    
    # 3. Define the Paths (Edges)
    # The Supervisor must always respond to the first message from the user (START)
    builder.add_edge(START, "Supervisor")
    
    # All agents return to SUPERVISOR for evaluation (Feedback / Loop)
    builder.add_edge("Researcher", "Supervisor")
    builder.add_edge("InstagramWriter", "Supervisor")
    builder.add_edge("LinkedInWriter", "Supervisor")
    builder.add_edge("TikTokWriter", "Supervisor")
    builder.add_edge("TwitterWriter", "Supervisor")
    builder.add_edge("Reviewer", "Supervisor")
    
    # Conditional Edges: Branch paths based on Supervisor's decision
    builder.add_conditional_edges(
        "Supervisor",
        lambda state: state["next"],
        {
            "Researcher": "Researcher",
            "InstagramWriter": "InstagramWriter",
            "LinkedInWriter": "LinkedInWriter",
            "TikTokWriter": "TikTokWriter",
            "TwitterWriter": "TwitterWriter",
            "Reviewer": "Reviewer",
            "FINISH": END
        }
    )
    
    # 4. Compile the graph
    graph = builder.compile()
    return graph

def main():
    print("=" * 65)
    print("🤖 AI Marketing Agency — Multi-Platform Content System")
    print("=" * 65)
    print()
    print("📸 Instagram  |  💼 LinkedIn  |  🎵 TikTok  |  🐦 Twitter/X")
    print()
    print("Note: Make sure you have your GOOGLE_API_KEY in the .env file.")
    print("Type 'q' or 'quit' to exit.")
    print("-" * 65)
    
    # Load the graph into memory
    app = build_marketing_team_graph()
    
    while True:
        user_input = input("\n📝 Send Request to Marketing Director:\n> ")
        
        if user_input.lower() in ["q", "quit", "exit"]:
            print("Shutting down the Marketing Agency system...")
            break
            
        if not user_input.strip():
            continue
        
        # Ask which platforms to target
        print("\n🎯 Which platforms? (comma-separated, or 'all' for all platforms)")
        print("   Options: instagram, linkedin, tiktok, twitter")
        platform_input = input("> ").strip().lower()
        
        if platform_input in ["all", "", "hepsi", "tümü"]:
            target_platforms = ["Instagram", "LinkedIn", "TikTok", "Twitter"]
        else:
            platform_map = {
                "instagram": "Instagram", "ig": "Instagram", "insta": "Instagram",
                "linkedin": "LinkedIn", "li": "LinkedIn",
                "tiktok": "TikTok", "tt": "TikTok",
                "twitter": "Twitter", "x": "Twitter", "tweet": "Twitter",
            }
            target_platforms = []
            for p in platform_input.split(","):
                p = p.strip()
                if p in platform_map:
                    target_platforms.append(platform_map[p])
            
            if not target_platforms:
                print("⚠️  No valid platforms selected. Defaulting to all platforms.")
                target_platforms = ["Instagram", "LinkedIn", "TikTok", "Twitter"]
        
        print(f"\n⚙️  Team starts working on: {', '.join(target_platforms)}...\n")
        
        # Initialize state with platform targeting
        initial_state = {
            "messages": [HumanMessage(content=user_input)],
            "next": "",
            "target_platforms": target_platforms,
            "completed_platforms": []
        }
        
        final_output = ""
        
        # Stream execution with recursion limit
        # More agents = need higher recursion limit
        for event in app.stream(initial_state, {"recursion_limit": 40}):
            for node_name, node_output in event.items():
                print(f"\n{'='*8} [FLOW] {node_name} {'='*8}")
                
                if "next" in node_output and "messages" not in node_output:
                    print(f"-> Decision: Task assigned to {node_output['next']} agent.")
                    
                elif "messages" in node_output:
                    last_msg = node_output["messages"][-1].content
                    
                    if isinstance(last_msg, list):
                        formatted_msg = "\n".join([
                            item.get("text", "") for item in last_msg 
                            if isinstance(item, dict) and "text" in item
                        ])
                        print(f"{formatted_msg}\n")
                        final_output += f"\n\n{'='*40}\n## {node_name}\n{'='*40}\n\n{formatted_msg}"
                    else:
                        print(f"{last_msg}\n")
                        final_output += f"\n\n{'='*40}\n## {node_name}\n{'='*40}\n\n{last_msg}"
                    
        print("\n✅ All platform content has been created and reviewed!")
        
        # Save the final structured output to a Markdown file
        output_dir = "outputs"
        os.makedirs(output_dir, exist_ok=True)
        safe_filename = "".join(c if c.isalnum() else "_" for c in user_input[:30]).strip("_")
        platforms_tag = "_".join([p.lower() for p in target_platforms])
        file_path = os.path.join(output_dir, f"{safe_filename}_{platforms_tag}_result.md")
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(f"# 🎯 Marketing Campaign: {user_input}\n\n")
            f.write(f"**Target Platforms:** {', '.join(target_platforms)}\n\n")
            f.write("---\n")
            f.write(final_output)
            
        print(f"📁 All content saved to: {file_path}")

if __name__ == "__main__":
    main()

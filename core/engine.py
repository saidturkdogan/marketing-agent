from langgraph.graph import END, START, StateGraph

from agents.analytics import analytics_node
from agents.blog_writer import blog_writer_node
from agents.publisher import publisher_node
from agents.image_prompt_writer import image_prompt_writer_node
from agents.instagram_writer import instagram_writer_node
from agents.linkedin_writer import linkedin_writer_node
from agents.planner import planner_node
from agents.researcher import researcher_node
from agents.reviewer import reviewer_node
from agents.strategy import strategist_node
from agents.supervisor import supervisor_node
from agents.tiktok_writer import tiktok_writer_node
from agents.trend_detector import trend_detector_node
from agents.twitter_writer import twitter_writer_node
from agents.video_script_writer import video_script_writer_node
from core.state import AgentState

# Nodes that run sequentially (Supervisor pops them off the queue)
SEQUENTIAL_NODES = [
    "Researcher",
    "TrendDetector",
    "Strategist",
    "Reviewer",
    "Publisher",
    "Analytics",
]

# Nodes that run in parallel (fanned out by Supervisor via Send)
PARALLEL_NODES = [
    "BlogWriter",
    "InstagramWriter",
    "LinkedInWriter",
    "TikTokWriter",
    "TwitterWriter",
    "VideoScriptWriter",
    "ImagePromptWriter",
]


def route_supervisor(state: AgentState):
    return state.get("next", "FINISH")


def build_marketing_team_graph():
    builder = StateGraph(AgentState)

    builder.add_node("Planner", planner_node)
    builder.add_node("Supervisor", supervisor_node)

    # Sequential agents
    builder.add_node("Researcher", researcher_node)
    builder.add_node("TrendDetector", trend_detector_node)
    builder.add_node("Strategist", strategist_node)
    builder.add_node("Reviewer", reviewer_node)
    builder.add_node("Publisher", publisher_node)
    builder.add_node("Analytics", analytics_node)

    # Parallel agents (fan-out targets)
    builder.add_node("BlogWriter", blog_writer_node)
    builder.add_node("InstagramWriter", instagram_writer_node)
    builder.add_node("LinkedInWriter", linkedin_writer_node)
    builder.add_node("TikTokWriter", tiktok_writer_node)
    builder.add_node("TwitterWriter", twitter_writer_node)
    builder.add_node("VideoScriptWriter", video_script_writer_node)
    builder.add_node("ImagePromptWriter", image_prompt_writer_node)

    # Planner always goes first
    builder.add_edge(START, "Planner")
    builder.add_edge("Planner", "Supervisor")

    # Sequential nodes return to Supervisor after finishing
    for node in SEQUENTIAL_NODES:
        builder.add_edge(node, "Supervisor")

    # Parallel nodes return to Supervisor after finishing (fan-in)
    for node in PARALLEL_NODES:
        builder.add_edge(node, "Supervisor")

    # Supervisor decides where to go next
    builder.add_conditional_edges(
        "Supervisor",
        route_supervisor,
        {
            "Researcher": "Researcher",
            "TrendDetector": "TrendDetector",
            "Strategist": "Strategist",
            "BlogWriter": "BlogWriter",
            "InstagramWriter": "InstagramWriter",
            "LinkedInWriter": "LinkedInWriter",
            "TikTokWriter": "TikTokWriter",
            "TwitterWriter": "TwitterWriter",
            "VideoScriptWriter": "VideoScriptWriter",
            "ImagePromptWriter": "ImagePromptWriter",
            "Reviewer": "Reviewer",
            "Publisher": "Publisher",
            "Analytics": "Analytics",
            "FINISH": END,
        },
    )

    return builder.compile()

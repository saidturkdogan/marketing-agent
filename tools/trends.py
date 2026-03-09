import json
from langchain_core.tools import tool


@tool
def get_google_trends(topic: str) -> str:
    """
    Returns Google Trends-style data for a topic.
    Production: connect to pytrends or SerpAPI Google Trends endpoint.
    """
    return json.dumps({
        "status": "success",
        "source": "Google Trends (simulated)",
        "topic": topic,
        "interest_over_time": "Rising",
        "peak_regions": ["United States", "United Kingdom", "India"],
        "related_queries": {
            "rising": [
                f"{topic} tutorial",
                f"best {topic} tools",
                f"{topic} for beginners",
                f"{topic} 2025",
            ],
            "top": [
                f"what is {topic}",
                f"{topic} examples",
                f"{topic} vs alternatives",
            ],
        },
        "breakout_topics": [f"{topic} AI", f"automated {topic}"],
    })


@tool
def get_reddit_trends(topic: str) -> str:
    """
    Returns trending Reddit posts and subreddit signals for a topic.
    Production: connect to Reddit API (PRAW) or Pushshift.
    """
    return json.dumps({
        "status": "success",
        "source": "Reddit (simulated)",
        "topic": topic,
        "top_subreddits": [
            f"r/{topic.replace(' ', '')}",
            "r/marketing",
            "r/entrepreneur",
            "r/productivity",
        ],
        "top_post_titles": [
            f"How I used {topic} to grow my business 10x",
            f"Unpopular opinion: {topic} is overrated",
            f"Complete beginner guide to {topic} — what actually worked for me",
        ],
        "common_pain_points": [
            "too complex for beginners",
            "expensive tools",
            "hard to measure ROI",
        ],
        "sentiment": "mostly_positive",
    })


@tool
def get_twitter_trends(topic: str) -> str:
    """
    Returns Twitter/X trending hashtags and viral thread patterns for a topic.
    Production: connect to Twitter v2 API or Brandwatch.
    """
    return json.dumps({
        "status": "success",
        "source": "Twitter/X (simulated)",
        "topic": topic,
        "trending_hashtags": [
            f"#{topic.replace(' ', '')}",
            f"#{topic.replace(' ', '')}tips",
            "#marketing",
            "#growthhack",
            "#contentmarketing",
        ],
        "viral_thread_formats": [
            "10 things nobody tells you about X",
            "I tried X for 30 days. Here is what happened:",
            "Stop making this mistake with X [thread]",
        ],
        "peak_posting_hours": "8-10 AM and 6-8 PM EST",
        "engagement_spike": "Last 7 days: +34%",
    })

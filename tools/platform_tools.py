from langchain_core.tools import tool
import json


@tool
def get_instagram_hashtags(topic: str) -> str:
    """
    Researches and suggests relevant Instagram hashtags for a given topic.
    Returns a mix of popular (high volume) and niche (low competition) hashtags.
    In production, this could connect to RapidAPI Instagram Hashtag APIs.
    """
    popular = [
        f"#{topic.replace(' ', '')}",
        f"#{topic.replace(' ', '')}tips",
        f"#{topic.replace(' ', '')}daily",
        f"#explore",
        f"#trending",
        f"#viral",
        f"#instagood",
        f"#reels",
        f"#instadaily",
        f"#{topic.replace(' ', '')}life",
    ]
    
    niche = [
        f"#{topic.replace(' ', '')}community",
        f"#{topic.replace(' ', '')}awareness",
        f"#{topic.replace(' ', '')}expert",
        f"#{topic.replace(' ', '')}hack",
        f"#{topic.replace(' ', '')}101",
        f"#{topic.replace(' ', '')}growth",
        f"#{topic.replace(' ', '')}strategy",
        f"#{topic.replace(' ', '')}motivation",
        f"#{topic.replace(' ', '')}journey",
        f"#{topic.replace(' ', '')}2026",
    ]
    
    return json.dumps({
        "status": "success",
        "popular_hashtags": popular,
        "niche_hashtags": niche,
        "recommendation": "Use 5-7 popular + 15-20 niche hashtags for best reach.",
        "total_count": len(popular) + len(niche)
    })


@tool
def get_trending_sounds(topic: str) -> str:
    """
    Suggests trending TikTok sounds and music that match the given topic or mood.
    In production, this could connect to TikTok Creative Center API.
    """
    trending_sounds = [
        {
            "name": "Original Sound - Motivational",
            "category": "Voiceover/Narration",
            "usage_tip": "Great for educational content and tips"
        },
        {
            "name": "Aesthetic Chill Beat",
            "category": "Background Music",
            "usage_tip": "Use for slow-motion product showcases or mood content"
        },
        {
            "name": "Dramatic Reveal Sound",
            "category": "Transition Effect",
            "usage_tip": "Perfect for before/after or transformation content"
        },
        {
            "name": "Trending Podcast Clip",
            "category": "Voiceover",
            "usage_tip": "Good for controversial takes or hot opinions"
        },
        {
            "name": "Upbeat Pop Remix",
            "category": "Energetic Music",
            "usage_tip": "Best for quick-cut, high-energy content"
        }
    ]
    
    return json.dumps({
        "status": "success",
        "topic": topic,
        "trending_sounds": trending_sounds,
        "tip": "Always check TikTok Creative Center for the latest trending sounds before filming."
    })


@tool
def get_platform_specs(platform: str) -> str:
    """
    Returns the current character limits, best practices, and format specifications
    for a given social media platform.
    """
    specs = {
        "instagram": {
            "caption_max_chars": 2200,
            "ideal_caption_length": "125-150 chars for feed, up to 2200 for carousel",
            "hashtag_limit": 30,
            "recommended_hashtags": "20-25",
            "formats": ["Feed Post", "Carousel (up to 10 slides)", "Reel (up to 90 sec)", "Story (15 sec per slide)"],
            "best_times_to_post": "Tue-Fri 9AM-12PM",
            "tips": [
                "First line is the hook — must grab attention",
                "Use line breaks for readability",
                "End with a CTA (save, share, comment)",
                "Emojis increase engagement by ~15%"
            ]
        },
        "linkedin": {
            "post_max_chars": 3000,
            "ideal_post_length": "1200-1500 chars",
            "hashtag_limit": 5,
            "recommended_hashtags": "3-5",
            "formats": ["Text Post", "Article", "Carousel (PDF)", "Newsletter", "Poll"],
            "best_times_to_post": "Tue-Thu 8AM-10AM",
            "tips": [
                "Hook in the first 2 lines (before 'see more')",
                "Use storytelling framework: Hook → Context → Value → CTA",
                "Avoid external links in main post (kills reach)",
                "Personal stories outperform corporate content 3x"
            ]
        },
        "tiktok": {
            "caption_max_chars": 4000,
            "ideal_caption_length": "50-150 chars",
            "video_length": "15-60 seconds ideal, max 10 min",
            "hashtag_limit": "No hard limit, 3-5 recommended",
            "formats": ["Short Video (15-60s)", "Long Video (1-10 min)", "LIVE", "Photo Carousel"],
            "best_times_to_post": "Tue-Thu 7PM-9PM",
            "tips": [
                "First 3 seconds determine if viewers stay — make it count",
                "Use text overlays for accessibility and hook",
                "Trending sounds boost discoverability 2-3x",
                "Post 1-3 times per day for algorithm favor"
            ]
        },
        "twitter": {
            "tweet_max_chars": 280,
            "thread_ideal_length": "5-10 tweets",
            "hashtag_limit": "2-3 max",
            "formats": ["Single Tweet", "Thread", "Poll", "Quote Tweet", "Spaces"],
            "best_times_to_post": "Mon-Fri 8AM-10AM, 12PM-1PM",
            "tips": [
                "First tweet is the hook — must stand alone",
                "Use numbers and brackets for higher CTR: [Thread] or '5 ways to...'",
                "Reply to your own thread to boost engagement",
                "Controversial (but respectful) takes get more reach"
            ]
        }
    }
    
    platform_key = platform.lower().strip()
    if platform_key in specs:
        return json.dumps({"status": "success", "platform": platform_key, "specs": specs[platform_key]})
    else:
        return json.dumps({
            "status": "error",
            "message": f"Unknown platform: {platform}. Supported: instagram, linkedin, tiktok, twitter"
        })

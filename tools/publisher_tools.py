"""
Publisher tool stubs.
Production: replace each tool body with real API calls using the credentials
stored in environment variables.
"""
import json
import os
from langchain_core.tools import tool


@tool
def publish_to_twitter(content: str, campaign_id: str) -> str:
    """
    Publish a tweet or thread to Twitter/X.
    Production: use Tweepy with TWITTER_BEARER_TOKEN + OAuth 1.0a credentials.
    """
    api_key = os.getenv("TWITTER_API_KEY", "")
    if not api_key:
        return json.dumps({"status": "skipped", "reason": "TWITTER_API_KEY not configured."})
    # Real call: tweepy.Client(bearer_token=...).create_tweet(text=content)
    return json.dumps({
        "status": "ready",
        "platform": "Twitter/X",
        "campaign_id": campaign_id,
        "payload_preview": content[:280],
        "note": "Stub — connect Tweepy to publish.",
    })


@tool
def publish_to_linkedin(content: str, campaign_id: str) -> str:
    """
    Publish a post to LinkedIn.
    Production: use LinkedIn API v2 with LINKEDIN_ACCESS_TOKEN.
    """
    token = os.getenv("LINKEDIN_ACCESS_TOKEN", "")
    if not token:
        return json.dumps({"status": "skipped", "reason": "LINKEDIN_ACCESS_TOKEN not configured."})
    return json.dumps({
        "status": "ready",
        "platform": "LinkedIn",
        "campaign_id": campaign_id,
        "payload_preview": content[:3000],
        "note": "Stub — connect LinkedIn API v2 to publish.",
    })


@tool
def publish_to_instagram(content: str, campaign_id: str) -> str:
    """
    Publish a post or reel to Instagram via Meta Graph API.
    Production: use META_ACCESS_TOKEN + PAGE_ID.
    """
    token = os.getenv("META_ACCESS_TOKEN", "")
    if not token:
        return json.dumps({"status": "skipped", "reason": "META_ACCESS_TOKEN not configured."})
    return json.dumps({
        "status": "ready",
        "platform": "Instagram",
        "campaign_id": campaign_id,
        "payload_preview": content[:2200],
        "note": "Stub — connect Meta Graph API to publish.",
    })


@tool
def publish_to_wordpress(title: str, content: str, campaign_id: str) -> str:
    """
    Publish a blog post to WordPress via REST API.
    Production: use WP_URL + WP_APPLICATION_PASSWORD.
    """
    wp_url = os.getenv("WP_URL", "")
    if not wp_url:
        return json.dumps({"status": "skipped", "reason": "WP_URL not configured."})
    return json.dumps({
        "status": "ready",
        "platform": "WordPress",
        "campaign_id": campaign_id,
        "title": title,
        "content_length": len(content),
        "note": "Stub — connect WordPress REST API to publish.",
    })

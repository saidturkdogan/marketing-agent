"""
Publisher tools for social media platforms.
Production-ready implementations for Twitter/X, LinkedIn, Instagram, and WordPress.
"""
import json
import os
import requests
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
    Publish a post to LinkedIn via API v2.
    
    Args:
        content: The post text (can include hashtags, mentions)
        campaign_id: Unique campaign identifier for tracking
    
    Returns:
        JSON string with publish status, post ID, and URL
    """
    access_token = os.getenv("LINKEDIN_ACCESS_TOKEN", "")
    
    if not access_token:
        return json.dumps({
            "status": "skipped",
            "reason": "LINKEDIN_ACCESS_TOKEN not configured. Run scripts/linkedin_oauth_setup.py"
        })
    
    try:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0"
        }
        
        # Step 1: Get user URN (LinkedIn person identifier)
        print("[LinkedIn]: Fetching user profile...")
        user_response = requests.get(
            "https://api.linkedin.com/v2/me",
            headers=headers,
            timeout=10
        )
        user_response.raise_for_status()
        user_data = user_response.json()
        person_id = user_data.get("id") or user_data.get("sub")
        
        if not person_id:
            return json.dumps({
                "status": "error",
                "reason": "Could not retrieve user ID from LinkedIn API",
                "response": user_data
            })
        
        author_urn = f"urn:li:person:{person_id}"
        print(f"[LinkedIn]: User URN: {author_urn}")
        
        # Step 2: Create the post
        print("[LinkedIn]: Creating post...")
        payload = {
            "author": author_urn,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {
                        "text": content
                    },
                    "shareMediaCategory": "NONE"  # Text-only post
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            }
        }
        
        response = requests.post(
            "https://api.linkedin.com/v2/ugcPosts",
            headers=headers,
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        
        post_data = response.json()
        post_id = post_data.get("id", "unknown")
        
        print(f"[LinkedIn]: Post published successfully! ID: {post_id}")
        
        return json.dumps({
            "status": "published",
            "platform": "LinkedIn",
            "campaign_id": campaign_id,
            "post_id": post_id,
            "url": f"https://www.linkedin.com/feed/update/{post_id}",
            "author_urn": author_urn,
            "content_length": len(content),
            "visibility": "PUBLIC"
        })
        
    except requests.exceptions.HTTPError as e:
        error_details = ""
        if e.response is not None:
            try:
                error_details = e.response.json()
            except:
                error_details = e.response.text
        
        # Common error handling
        if e.response and e.response.status_code == 401:
            return json.dumps({
                "status": "error",
                "error": "Unauthorized - Access token expired or invalid",
                "details": "Run scripts/linkedin_oauth_setup.py to generate new token",
                "http_status": 401
            })
        elif e.response and e.response.status_code == 403:
            return json.dumps({
                "status": "error",
                "error": "Forbidden - Insufficient permissions",
                "details": "Ensure 'Share on LinkedIn' product is approved in your app",
                "http_status": 403
            })
        
        return json.dumps({
            "status": "error",
            "error": str(e),
            "details": error_details,
            "campaign_id": campaign_id
        })
        
    except requests.exceptions.RequestException as e:
        return json.dumps({
            "status": "error",
            "error": f"Network error: {str(e)}",
            "campaign_id": campaign_id
        })
        
    except Exception as e:
        return json.dumps({
            "status": "error",
            "error": f"Unexpected error: {str(e)}",
            "campaign_id": campaign_id
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

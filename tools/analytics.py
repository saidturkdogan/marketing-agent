from langchain_core.tools import tool
import json
import urllib.request

@tool
def get_seo_keywords(topic: str) -> str:
    """
    Simulates an SEO tool to find trending keywords for a given topic.
    In a real-world scenario, this could connect to Google Keyword Planner, Ahrefs, or SEMrush APIs.
    """
    # Simulate a delay or fake logic based on the string
    keywords = [
        f"{topic} tips", 
        f"best {topic} strategies", 
        f"how to deal with {topic}", 
        f"{topic} awareness", 
        f"{topic} symptoms"
    ]
    
    return json.dumps({
        "status": "success",
        "primary_keywords": keywords[:3],
        "secondary_keywords": keywords[3:],
        "search_volume": "High (Simulated Data)"
    })

@tool
def check_content_policy(text: str) -> str:
    """
    Analyzes the text to ensure it complies with modern LinkedIn/Marketing policies 
    (no clickbait, no spammy words, professional tone).
    """
    spam_words = ["buy now", "click here", "miracle", "guaranteed", "100%"]
    found_spam = [word for word in spam_words if word in text.lower()]
    
    if found_spam:
        return f"Violation detected: Please remove spammy words: {found_spam}"
    
    return "Content passed policy check. Tone is professional and compliant."

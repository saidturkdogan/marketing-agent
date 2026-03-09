from langchain_google_genai import ChatGoogleGenerativeAI
from core.config import GOOGLE_API_KEY

def get_llm(temperature=0.4):
    """
    Returns the AI language model to be used throughout the system.
    Recommendation: Use the latest model for planning and reasoning.
    """
    return ChatGoogleGenerativeAI(
        model="gemini-pro-latest",  # You could use gemini-flash-latest for a cheaper alternative
        temperature=temperature, # Balance between creativity and precision
        google_api_key=GOOGLE_API_KEY
    )

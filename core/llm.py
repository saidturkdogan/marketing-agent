from langchain_google_genai import ChatGoogleGenerativeAI
from core.config import GOOGLE_API_KEY, GOOGLE_MODEL

def get_llm(temperature=0.4):
    """
    Returns the configured Gemini chat model.
    """
    return ChatGoogleGenerativeAI(
        model=GOOGLE_MODEL,
        temperature=temperature,
        google_api_key=GOOGLE_API_KEY
    )

import os
from dotenv import load_dotenv

# Load variables from the .env file into the system
load_dotenv()

# Extract important API keys
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GOOGLE_MODEL = os.getenv("GOOGLE_MODEL", "gemini-2.0-flash")
DATABASE_URL = os.getenv("DATABASE_URL", "")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Issue a warning if a key is missing
if not GOOGLE_API_KEY:
    print("WARNING: GOOGLE_API_KEY not found in .env file! Agents may not be able to access the language models.")

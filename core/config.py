import os
from dotenv import load_dotenv

# Load variables from the .env file into the system
load_dotenv()

# Extract important API keys
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

# Issue a warning if a key is missing
if not GOOGLE_API_KEY:
    print("WARNING: GOOGLE_API_KEY not found in .env file! Agents may not be able to access the language models.")

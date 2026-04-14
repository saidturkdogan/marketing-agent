"""
LinkedIn OAuth 2.0 Token Generation Script

This script helps you generate a LinkedIn access token for the marketing agent.
Run this once every 60 days (token expiry period).

Usage:
    python scripts/linkedin_oauth_setup.py

Prerequisites:
    1. LinkedIn Developer App created and approved
    2. CLIENT_ID and CLIENT_SECRET from app dashboard
    3. Redirect URL configured: http://localhost:8080/linkedin/callback
"""
import os
import sys
import webbrowser
import json
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import requests
from dotenv import load_dotenv

# Load existing .env if present
load_dotenv()

# ── Configuration ──────────────────────────────────────────────────────────
CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET", "")
REDIRECT_URI = os.getenv("LINKEDIN_REDIRECT_URL", "http://localhost:8080/linkedin/callback")
REDIRECT_PORT = 8080

# Required scopes for posting
SCOPES = [
    "openid",           # Profile access
    "profile",          # Basic profile info
    "email",            # Email address
    "w_member_social",  # Post on behalf of user
]

if not CLIENT_ID or not CLIENT_SECRET:
    print("❌ Error: LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET not found in .env")
    print("\n📋 Please add these to your .env file:")
    print("   LINKEDIN_CLIENT_ID=your_client_id")
    print("   LINKEDIN_CLIENT_SECRET=your_client_secret")
    print("\n💡 Get them from: https://www.linkedin.com/developers/apps")
    sys.exit(1)


# ── Step 1: Generate Authorization URL ────────────────────────────────────
def get_auth_url():
    """Generate LinkedIn OAuth authorization URL."""
    scope_string = " ".join(SCOPES)
    auth_url = (
        "https://www.linkedin.com/oauth/v2/authorization"
        "?response_type=code"
        f"&client_id={CLIENT_ID}"
        f"&redirect_uri={REDIRECT_URI}"
        f"&state=marketing_agent_state_{os.getpid()}"
        f"&scope={scope_string}"
    )
    return auth_url


# ── Step 2: Temporary HTTP Server to Capture Callback ─────────────────────
class LinkedInCallbackHandler(BaseHTTPRequestHandler):
    """Handle OAuth callback from LinkedIn."""
    
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        
        # Extract authorization code
        code = params.get("code", [None])[0]
        error = params.get("error", [None])[0]
        
        if error:
            print(f"\n❌ LinkedIn OAuth Error: {error}")
            print(f"Error description: {params.get('error_description', ['Unknown'])[0]}")
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"OAuth error occurred. Check console for details.")
            return
        
        if not code:
            print("\n❌ No authorization code received")
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"No code received")
            return
        
        print("\n✅ Authorization code received!")
        print(f"Code: {code[:20]}...\n")
        
        # Exchange code for token
        exchange_code_for_token(code)
        
        # Send success response to browser
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(b"""
            <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h2>✅ LinkedIn Authorization Successful!</h2>
                <p>You can close this window and return to the terminal.</p>
            </body>
            </html>
        """)
        
        # Shutdown server after handling request
        self.server.shutdown()
    
    def log_message(self, format, *args):
        """Suppress default logging."""
        pass


# ── Step 3: Exchange Code for Access Token ───────────────────────────────
def exchange_code_for_token(code: str):
    """Exchange authorization code for access token."""
    print("🔄 Exchanging authorization code for access token...")
    
    token_url = "https://www.linkedin.com/oauth/v2/accessToken"
    
    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    }
    
    try:
        response = requests.post(token_url, data=payload, timeout=30)
        response.raise_for_status()
        
        token_data = response.json()
        
        print("\n" + "=" * 70)
        print("🎉 SUCCESS! Your LinkedIn Access Token:")
        print("=" * 70)
        print(f"\nLINKEDIN_ACCESS_TOKEN={token_data['access_token']}")
        print(f"\n⏰ Expires in: {token_data.get('expires_in', 'unknown')} seconds")
        print(f"   (That's approximately {token_data.get('expires_in', 5184000) // 86400} days)")
        print("=" * 70)
        
        # Test the token by fetching profile
        print("\n🧪 Testing token by fetching your profile...")
        profile = test_token(token_data["access_token"])
        
        if profile:
            print(f"✅ Profile: {profile.get('given_name', '')} {profile.get('family_name', '')}")
            print(f"   Email: {profile.get('email', 'N/A')}")
            print(f"   Profile ID: {profile.get('sub', 'N/A')}")
        
        # Offer to save to .env
        save_to_env(token_data["access_token"])
        
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Failed to exchange code: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response: {e.response.text}")
        sys.exit(1)


# ── Step 4: Test Token ───────────────────────────────────────────────────
def test_token(access_token: str) -> dict:
    """Test access token by fetching user profile."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    
    try:
        # OpenID Connect userinfo endpoint
        response = requests.get(
            "https://api.linkedin.com/v2/userinfo",
            headers=headers,
            timeout=10
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"⚠️  Token test failed: {e}")
        print("   Token may be invalid, but continuing anyway...")
        return {}


# ── Step 5: Save to .env ─────────────────────────────────────────────────
def save_to_env(access_token: str):
    """Offer to save token to .env file."""
    env_path = Path(".env")
    
    print("\n💾 Would you like to save this token to .env file? (y/n)")
    choice = input("   Choice: ").strip().lower()
    
    if choice != 'y':
        print("\n⏭️  Token not saved. Remember to add it manually!")
        return
    
    # Read existing .env
    existing_lines = []
    if env_path.exists():
        existing_lines = env_path.read_text().splitlines()
    
    # Check if LINKEDIN_ACCESS_TOKEN already exists
    token_exists = any(line.startswith("LINKEDIN_ACCESS_TOKEN=") for line in existing_lines)
    
    # Add or update token
    if token_exists:
        # Replace existing line
        new_lines = []
        for line in existing_lines:
            if line.startswith("LINKEDIN_ACCESS_TOKEN="):
                new_lines.append(f"LINKEDIN_ACCESS_TOKEN={access_token}")
            else:
                new_lines.append(line)
        existing_lines = new_lines
        print("✅ Updated existing LINKEDIN_ACCESS_TOKEN in .env")
    else:
        # Add new line
        existing_lines.append(f"\n# LinkedIn API Access Token (expires in 60 days)")
        existing_lines.append(f"LINKEDIN_ACCESS_TOKEN={access_token}")
        print("✅ Added LINKEDIN_ACCESS_TOKEN to .env")
    
    # Write back
    env_path.write_text("\n".join(existing_lines) + "\n")
    print(f"   Saved to: {env_path.absolute()}")
    
    # Reminder
    print("\n⚠️  REMINDER: This token expires in ~60 days!")
    print("   Run this script again to generate a new token.")


# ── Main Flow ─────────────────────────────────────────────────────────────
def main():
    print("=" * 70)
    print("🔐 LinkedIn OAuth Token Generator")
    print("=" * 70)
    print(f"\n📱 App Client ID: {CLIENT_ID[:20]}...")
    print(f"🔗 Redirect URI: {REDIRECT_URI}")
    print(f"🔑 Scopes: {', '.join(SCOPES)}")
    print()
    
    # Step 1: Generate auth URL
    auth_url = get_auth_url()
    print("🔗 Opening LinkedIn authorization page in your browser...")
    print(f"\nIf browser doesn't open, copy this URL:")
    print(auth_url)
    print()
    
    # Open browser
    webbrowser.open(auth_url)
    
    # Step 2: Start callback server
    print("⏳ Waiting for LinkedIn authorization...")
    print("   (Complete the authorization in your browser)")
    print()
    print("🛑 Press Ctrl+C to cancel")
    print()
    
    try:
        server = HTTPServer(("localhost", REDIRECT_PORT), LinkedInCallbackHandler)
        print(f"🌐 Callback server running on port {REDIRECT_PORT}")
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\n⏹️  OAuth setup cancelled")
        sys.exit(0)
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"\n❌ Port {REDIRECT_PORT} is already in use.")
            print("   Please stop the process using that port, or change LINKEDIN_REDIRECT_URL in .env")
            sys.exit(1)
        raise


if __name__ == "__main__":
    main()

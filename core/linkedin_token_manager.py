"""
LinkedIn Token Manager

Handles token refresh, expiry tracking, and automatic re-authentication prompts.
LinkedIn access tokens expire after 60 days - this module helps manage that.

Usage:
    from core.linkedin_token_manager import LinkedInTokenManager
    
    manager = LinkedInTokenManager()
    if manager.is_token_expired():
        print("Token expired! Please re-authenticate.")
        manager.refresh_token()
"""
import os
import time
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional


class LinkedInTokenManager:
    """Manage LinkedIn access token lifecycle."""
    
    TOKEN_FILE = ".linkedin_token_meta.json"
    TOKEN_EXPIRY_DAYS = 60  # LinkedIn tokens expire after 60 days
    WARNING_DAYS_BEFORE = 7  # Warn 7 days before expiry
    
    def __init__(self):
        self.token_meta_path = Path(self.TOKEN_FILE)
        self.token_meta = self._load_meta()
    
    def _load_meta(self) -> dict:
        """Load token metadata from file."""
        if self.token_meta_path.exists():
            try:
                with open(self.token_meta_path, 'r') as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}
    
    def _save_meta(self, meta: dict):
        """Save token metadata."""
        with open(self.token_meta_path, 'w') as f:
            json.dump(meta, f, indent=2)
    
    def get_access_token(self) -> Optional[str]:
        """Get current access token from environment."""
        return os.getenv("LINKEDIN_ACCESS_TOKEN")
    
    def is_token_expired(self) -> bool:
        """Check if token is expired or about to expire."""
        token = self.get_access_token()
        if not token:
            return True
        
        # Check if we have metadata
        if not self.token_meta:
            # No metadata - assume token might be expired
            return False  # Can't determine, let API call fail naturally
        
        expiry_date = self.token_meta.get("expires_at")
        if not expiry_date:
            return False
        
        try:
            expiry_dt = datetime.fromisoformat(expiry_date)
            return datetime.now() >= expiry_dt
        except ValueError:
            return False
    
    def is_token_expiring_soon(self) -> bool:
        """Check if token will expire within WARNING_DAYS_BEFORE days."""
        token = self.get_access_token()
        if not token or not self.token_meta:
            return False
        
        expiry_date = self.token_meta.get("expires_at")
        if not expiry_date:
            return False
        
        try:
            expiry_dt = datetime.fromisoformat(expiry_date)
            warning_threshold = datetime.now() + timedelta(days=self.WARNING_DAYS_BEFORE)
            return expiry_dt <= warning_threshold
        except ValueError:
            return False
    
    def get_days_until_expiry(self) -> Optional[int]:
        """Get number of days until token expires."""
        if not self.token_meta:
            return None
        
        expiry_date = self.token_meta.get("expires_at")
        if not expiry_date:
            return None
        
        try:
            expiry_dt = datetime.fromisoformat(expiry_date)
            delta = expiry_dt - datetime.now()
            return max(0, delta.days)
        except ValueError:
            return None
    
    def record_token(self, access_token: str, expires_in_seconds: int = 5184000):
        """
        Record new token and its expiry time.
        Call this after generating a new token via OAuth script.
        
        Args:
            access_token: The new access token
            expires_in_seconds: Token lifetime in seconds (default: 60 days)
        """
        now = datetime.now()
        expiry = now + timedelta(seconds=expires_in_seconds)
        
        meta = {
            "token": access_token[:20] + "...",  # Store only prefix for security
            "created_at": now.isoformat(),
            "expires_at": expiry.isoformat(),
            "expires_in_seconds": expires_in_seconds
        }
        
        self.token_meta = meta
        self._save_meta(meta)
        
        print(f"✅ Token recorded. Expires: {expiry.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"   Days until expiry: {expires_in_seconds // 86400}")
    
    def refresh_token(self):
        """
        Trigger token refresh by running OAuth setup script.
        This is a helper that guides the user through re-authentication.
        """
        print("\n" + "=" * 70)
        print("🔄 LinkedIn Token Refresh Required")
        print("=" * 70)
        
        days_left = self.get_days_until_expiry()
        if days_left is not None:
            print(f"⏰ Current token expires in {days_left} days")
        else:
            print("⏰ Token expiry status unknown")
        
        print("\nTo refresh your token:")
        print("1. Run: python scripts/linkedin_oauth_setup.py")
        print("2. Complete the OAuth flow in your browser")
        print("3. New token will be saved to .env")
        print("4. Restart your marketing agent")
        print()
        
        # Optional: Auto-run the script
        auto_run = input("Run OAuth setup now? (y/n): ").strip().lower()
        if auto_run == 'y':
            import subprocess
            import sys
            try:
                subprocess.run(
                    [sys.executable, "scripts/linkedin_oauth_setup.py"],
                    check=True
                )
                print("\n✅ OAuth setup complete! New token is active.")
            except subprocess.CalledProcessError as e:
                print(f"\n❌ OAuth setup failed: {e}")
                print("   Please run scripts/linkedin_oauth_setup.py manually")
    
    def check_and_warn(self):
        """Check token status and print warnings if needed."""
        if self.is_token_expired():
            print("\n⚠️  WARNING: LinkedIn access token is EXPIRED!")
            print("   LinkedIn posts will fail until you refresh the token.")
            print("   Run: python scripts/linkedin_oauth_setup.py")
            return False
        
        if self.is_token_expiring_soon():
            days_left = self.get_days_until_expiry()
            print(f"\n⚠️  NOTICE: LinkedIn token expires in {days_left} days")
            print("   Consider refreshing soon: python scripts/linkedin_oauth_setup.py")
        
        return True


# ── Integration Helper ─────────────────────────────────────────────────────

def check_linkedin_token():
    """
    Quick check function to call before publishing to LinkedIn.
    Returns (is_valid: bool, message: str)
    """
    manager = LinkedInTokenManager()
    
    token = manager.get_access_token()
    if not token:
        return False, "LINKEDIN_ACCESS_TOKEN not configured in .env"
    
    if manager.is_token_expired():
        days_overdue = None
        expiry = manager.token_meta.get("expires_at")
        if expiry:
            try:
                expiry_dt = datetime.fromisoformat(expiry)
                days_overdue = (datetime.now() - expiry_dt).days
            except:
                pass
        
        msg = "LinkedIn token is EXPIRED"
        if days_overdue:
            msg += f" (expired {days_overdue} days ago)"
        msg += ". Run: python scripts/linkedin_oauth_setup.py"
        return False, msg
    
    if manager.is_token_expiring_soon():
        days_left = manager.get_days_until_expiry()
        return True, f"Token expires in {days_left} days (refresh recommended)"
    
    return True, "Token is valid"


# ── CLI Usage ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    manager = LinkedInTokenManager()
    
    print("=" * 70)
    print("🔍 LinkedIn Token Status Check")
    print("=" * 70)
    
    token = manager.get_access_token()
    if not token:
        print("\n❌ No LinkedIn access token configured")
        print("   Run: python scripts/linkedin_oauth_setup.py")
    else:
        print(f"\n✅ Token: {token[:20]}...")
        
        if manager.is_token_expired():
            print("   Status: ⛔ EXPIRED")
            print("   Action: Run python scripts/linkedin_oauth_setup.py")
        elif manager.is_token_expiring_soon():
            days_left = manager.get_days_until_expiry()
            print(f"   Status: ⚠️  Expiring soon ({days_left} days left)")
            print("   Action: Consider refreshing")
        else:
            days_left = manager.get_days_until_expiry()
            print(f"   Status: ✅ Valid ({days_left} days until expiry)")
            print("   Action: None needed")
    
    print()

# LinkedIn Publishing - Quick Start Guide

## 🚀 Get LinkedIn Publishing Working in 15 Minutes

### Prerequisites
- ✅ LinkedIn account
- ✅ Python 3.10+ installed
- ✅ Marketing agent project downloaded

---

## Step 1: Create LinkedIn Developer App (5 min)

1. Go to **https://www.linkedin.com/developers/apps/new**
2. Fill in:
   - **App name**: `Marketing Agent`
   - **Description**: `Automated marketing content publishing`
3. Click **"Create app"**
4. Copy your **Client ID** and **Client Secret** from the dashboard

---

## Step 2: Configure App Settings (2 min)

1. Click **"Auth"** tab
2. Add redirect URL: `http://localhost:8080/linkedin/callback`
3. Click **"Products"** tab
4. Find **"Share on LinkedIn"** → Click **"Request Access"**
5. Fill in use case (be specific about your usage)
6. Submit and wait for approval (1-3 business days)

**⏰ While waiting for approval**, you can continue with steps 3-4 below.

---

## Step 3: Add Credentials to .env (1 min)

Copy `.env.example` to `.env` (if not exists):

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# LinkedIn API Configuration
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_REDIRECT_URL=http://localhost:8080/linkedin/callback
# LINKEDIN_ACCESS_TOKEN will be added automatically by OAuth script
```

---

## Step 4: Generate Access Token (3 min)

Once your app is approved:

```bash
# Run the OAuth setup script
python scripts/linkedin_oauth_setup.py
```

**What happens:**
1. Browser opens LinkedIn login page
2. You log in and approve permissions
3. LinkedIn redirects back to local server
4. Script exchanges code for access token
5. Token is automatically saved to `.env`

**You should see:**
```
🎉 SUCCESS! Your LinkedIn Access Token:
======================================================================

LINKEDIN_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIs...

⏰ Expires in: 5184000 seconds
   (That's approximately 60 days)
======================================================================
```

---

## Step 5: Test Token (1 min)

Verify your token is working:

```bash
python core/linkedin_token_manager.py
```

**Expected output:**
```
======================================================================
🔍 LinkedIn Token Status Check
======================================================================

✅ Token: eyJhbGciOiJIUzI1NiIs...
   Status: ✅ Valid (60 days until expiry)
   Action: None needed
```

---

## Step 6: Run Test Campaign (2 min)

Now test the full pipeline:

```bash
python main.py
```

**When prompted:**
```
Enter your campaign topic: AI-powered marketing automation

Target platforms (comma-separated): LinkedIn

Requested outputs (comma-separated): social

Enable auto-publish? (y/n): y
```

**What happens:**
1. LinkedInWriter generates professional post
2. Publisher node calls `publish_to_linkedin`
3. Post is published to your LinkedIn profile
4. You get the post URL in console output

**Expected console output:**
```
[Publisher]: preparing publish manifest...
[LinkedIn]: Fetching user profile...
[LinkedIn]: User URN: urn:li:person:abc123
[LinkedIn]: Creating post...
[LinkedIn]: Post published successfully! ID: urn:li:share:7890123456
```

**Check your LinkedIn profile** - the post should be live! 🎉

---

## 🧪 Additional Tests

### Test 1: Check Token Status Anytime

```bash
python core/linkedin_token_manager.py
```

### Test 2: Manual Post Publish (Debug)

Create a test script `test_linkedin_publish.py`:

```python
import os
from dotenv import load_dotenv
from tools.publisher_tools import publish_to_linkedin

load_dotenv()

# Test content
test_content = """
🚀 Exciting news!

Just launched our new AI-powered marketing automation system. 
It creates and publishes content across platforms automatically.

#MarketingAutomation #AI #Innovation
"""

# Publish
result = publish_to_linkedin.invoke({
    "content": test_content,
    "campaign_id": "test_001"
})

import json
data = json.loads(result)
print(json.dumps(data, indent=2))

if data["status"] == "published":
    print(f"\n✅ Post published: {data['url']}")
else:
    print(f"\n❌ Failed: {data.get('error', 'Unknown error')}")
```

Run it:
```bash
python test_linkedin_publish.py
```

### Test 3: Token Refresh (After 60 Days)

When token expires:

```bash
python scripts/linkedin_oauth_setup.py
```

Same process as Step 4 - generates new token automatically.

---

## 📊 Monitoring & Maintenance

### Check Token Expiry

```bash
# Quick status check
python core/linkedin_token_manager.py
```

### Automatic Warnings

The system will warn you when token is about to expire (7 days before):

```
⚠️  NOTICE: LinkedIn token expires in 5 days
   Consider refreshing soon: python scripts/linkedin_oauth_setup.py
```

### Token Refresh Reminder

Set a calendar reminder for **Day 53** (7 days before expiry):
- Run: `python scripts/linkedin_oauth_setup.py`
- Takes 2 minutes
- New token valid for another 60 days

---

## ❌ Troubleshooting

### "LINKEDIN_ACCESS_TOKEN not configured"

**Problem:** Token not in `.env` file

**Solution:**
```bash
python scripts/linkedin_oauth_setup.py
```

---

### "Unauthorized - Access token expired or invalid" (401)

**Problem:** Token expired (60-day limit)

**Solution:**
```bash
# Generate new token
python scripts/linkedin_oauth_setup.py

# Restart your application
python main.py
```

---

### "Forbidden - Insufficient permissions" (403)

**Problem:** "Share on LinkedIn" product not approved

**Solution:**
1. Go to: https://www.linkedin.com/developers/apps
2. Click your app → Products tab
3. Request "Share on LinkedIn" access
4. Wait for approval (1-3 days)

---

### "Could not retrieve user ID from LinkedIn API"

**Problem:** API endpoint changed or token invalid

**Solution:**
1. Check token is valid: `python core/linkedin_token_manager.py`
2. If expired, refresh: `python scripts/linkedin_oauth_setup.py`
3. If still failing, check LinkedIn API status: https://www.linkedinstatus.com/

---

### "Port 8080 is already in use"

**Problem:** Another process using the callback port

**Solution Option 1:** Stop the other process
```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8080 | xargs kill -9
```

**Solution Option 2:** Change redirect URL in `.env`:
```env
LINKEDIN_REDIRECT_URL=http://localhost:9999/linkedin/callback
```
Then update LinkedIn app settings to match this URL.

---

### OAuth Browser Doesn't Open

**Problem:** Script can't open browser automatically

**Solution:**
1. Script will print the URL to console
2. Manually copy and paste into browser
3. Complete authorization
4. Browser redirects to callback URL
5. Script captures the code automatically

---

## 📝 Content Format Tips

### Best Practices for LinkedIn Posts

✅ **DO:**
- Start with emoji or hook (grabs attention)
- Use 3-5 relevant hashtags
- Include call-to-action
- Keep under 3,000 characters
- Use line breaks for readability

❌ **DON'T:**
- Post walls of text (use paragraphs)
- Overdo hashtags (3-5 max)
- Include external links in first comment (better reach)
- Use ALL CAPS (looks spammy)

### Example Post Format

```
🚀 [Hook - exciting announcement]

[2-3 sentences explaining the news]

💡 [Key insight or benefit]

[Call to action or question for engagement]

#Hashtag1 #Hashtag2 #Hashtag3
```

**Your LinkedInWriter already generates posts in this format!** ✅

---

## 🎯 Next Steps

### 1. Add Image Support (Advanced)

LinkedIn posts with images get 2x more engagement. To add image support:

```python
# In publish_to_linkedin, before creating post:

# Upload image
image_upload_url = "https://api.linkedin.com/v2/images"
image_response = requests.post(
    image_upload_url,
    headers=headers,
    files={"file": open("image.jpg", "rb")}
)
image_urn = image_response.json()["id"]

# Include in post payload
payload["specificContent"]["com.linkedin.ugc.ShareContent"]["shareMediaCategory"] = "IMAGE"
payload["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = [{
    "status": "READY",
    "description": {"text": "Image description"},
    "media": image_urn
}]
```

### 2. Schedule Posts (Future Feature)

Instead of immediate publish, add to queue:

```python
# Add to Redis with timestamp
import redis
from datetime import datetime, timedelta

scheduled_time = datetime.now() + timedelta(hours=2)
redis_client.zadd(
    "linkedin:scheduled_posts",
    json.dumps({"content": content, "time": scheduled_time.isoformat()}),
    scheduled_time.timestamp()
)
```

### 3. Track Performance (Analytics)

After publishing, monitor engagement:

```python
# Fetch post analytics
analytics_url = f"https://api.linkedin.com/v2/organizationalEntityAnalytics"
# (Requires additional permissions)
```

---

## 📚 Resources

- **LinkedIn API Docs**: https://learn.microsoft.com/en-us/linkedin/
- **Share on LinkedIn**: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
- **OAuth 2.0 Guide**: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
- **API Status**: https://www.linkedinstatus.com/
- **Developer Support**: https://www.linkedin.com/help/linkedin/answer/a1335775

---

## ✅ Checklist

Before going to production:

- [ ] LinkedIn Developer App created
- [ ] "Share on LinkedIn" product approved
- [ ] Client ID and Secret in `.env`
- [ ] Access token generated and saved
- [ ] Token status check passed
- [ ] Test campaign published successfully
- [ ] Calendar reminder set for token refresh (Day 53)
- [ ] Error monitoring in place
- [ ] Content review process defined (if needed)

---

**That's it! Your LinkedIn publishing is now live.** 🎉

For Twitter, WordPress, or other platforms, see `SOCIAL_MEDIA_PUBLISHING_ANALYSIS.md`.

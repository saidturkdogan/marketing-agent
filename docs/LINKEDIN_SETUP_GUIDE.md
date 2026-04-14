# LinkedIn API Setup Guide

## 📋 Step-by-Step: Get LinkedIn API Credentials

### Step 1: Create LinkedIn Developer Account (5 minutes)

1. Go to: **https://developer.linkedin.com/**
2. Click **"Sign In"** (use your regular LinkedIn account)
3. If prompted, click **"Become a Developer"** to create developer profile
4. Agree to terms of service

---

### Step 2: Create New App (10 minutes)

1. Go to: **https://www.linkedin.com/developers/apps/new**
2. Fill in:
   - **App name**: `Marketing Agent` (or any name)
   - **Company**: Your name or company
   - **App logo**: Optional
   - **Description**: `Automated content publishing for marketing campaigns`
3. Click **"Create app"**
4. You'll be taken to your app dashboard

---

### Step 3: Get Client Credentials (2 minutes)

On your app dashboard, you'll see:
- **Client ID** (also called "App ID")
- **Client Secret** (click "Show" to reveal)

**Copy both values** - you'll need them in a moment.

---

### Step 4: Configure App Settings (5 minutes)

1. Click **"Auth"** tab on left sidebar
2. Under **Authorized Redirect URLs for OAuth 2.0**, click **"Add"**
3. Add: `http://localhost:8080/linkedin/callback`
4. Click **"Save"**

**Why this URL?** This is where LinkedIn sends the authorization code after user approves. We'll capture it in our OAuth script.

---

### Step 5: Request API Permissions (10 minutes)

1. Click **"Products"** tab on left sidebar
2. Find **"Share on LinkedIn"** product
3. Click **"Request Access"**
4. Fill out the form:
   - **Use case**: `We are building a marketing automation tool that helps businesses schedule and publish content to LinkedIn.`
   - **Expected usage**: `Our internal marketing team will publish 10-50 posts per month.`
   - **Company page URL**: Your LinkedIn profile URL
5. Click **"Submit"**

**⚠️ Important**: Approval typically takes **1-3 business days**. You'll get an email when approved.

---

### Step 6: Note Down Your Credentials

Create a `.env.linkedin` file (or add to your main `.env`):

```env
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_REDIRECT_URL=http://localhost:8080/linkedin/callback
```

**You'll get `LINKEDIN_ACCESS_TOKEN` after running the OAuth script (next step).**

---

## 🔑 Step 7: Generate Access Token (One-Time Setup)

After your app is approved:

1. Create the OAuth script: `scripts/linkedin_oauth_setup.py`
   (We'll create this in the next step)

2. Run it:
   ```bash
   python scripts/linkedin_oauth_setup.py
   ```

3. The script will:
   - Open a browser window (or give you a URL)
   - You log in to LinkedIn and approve permissions
   - LinkedIn redirects back with authorization code
   - Script exchanges code for access token
   - Token is printed to console

4. Copy the token to `.env`:
   ```env
   LINKEDIN_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIs...
   ```

**⚠️ Token expires in 60 days!** We'll add auto-refresh logic later.

---

## ✅ Verification: Test Your Setup

After setup is complete, test with:

```bash
python scripts/linkedin_test.py
```

This will:
1. Use your access token
2. Fetch your LinkedIn profile
3. Create a test post
4. Print the post URL

If successful, you're ready to integrate with the marketing agent!

---

## 🚨 Troubleshooting

### "App not approved" error
- Wait 1-3 business days for manual review
- Check email for LinkedIn's decision
- Common rejection reason: Unclear use case (be specific)

### "Insufficient permissions" error
- Make sure you requested "Share on LinkedIn" product
- Check app dashboard → Products → should show "Approved"
- May need to re-request if permissions changed

### "Token expired" error
- Tokens expire after 60 days
- Run OAuth setup script again to get new token
- OR: Implement refresh token logic (see `REFRESH_TOKEN_GUIDE.md`)

### "Invalid redirect URL" error
- Redirect URL in app settings MUST match the one in your script
- Check: App dashboard → Auth → Authorized Redirect URLs
- Must be exact match (including `http://` vs `https://`)

---

## 📚 API Endpoints We'll Use

| Endpoint | Purpose | Method |
|----------|---------|--------|
| `https://api.linkedin.com/v2/me` | Get user profile (ID, name) | GET |
| `https://api.linkedin.com/v2/ugcPosts` | Create text posts | POST |
| `https://api.linkedin.com/v2/images` | Upload images for carousels | POST |
| `https://api.linkedin.com/oauth/v2/accessToken` | Exchange code for token | POST |

**Rate Limits:**
- 100 requests/day for standard access
- 5,000 requests/day for verified partners
- Posts: 25 per day per user

---

## 🎯 Next Steps

After completing this setup:
1. ✅ Run `publisher_tools.py` update (replacing stub with real implementation)
2. ✅ Test single post publish
3. ✅ Test carousel post (optional)
4. ✅ Add token refresh logic
5. ✅ Integrate with marketing agent pipeline

---

## 💡 Pro Tips

1. **Use Personal Profile for Testing**: Easier than company page setup
2. **Start with Text-Only Posts**: Simpler, no image upload needed
3. **Draft Mode First**: Set `status: "draft"` in API call for review before publishing
4. **Monitor API Usage**: Dashboard shows remaining daily quota
5. **Backup Token**: Save token in password manager in case you lose `.env`

---

**Ready to proceed?** Let me know when you have your Client ID and Client Secret!

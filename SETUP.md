# Setup Guide

Step-by-step instructions for getting the AI Content Factory running from scratch.

---

## Prerequisites

| Tool          | Minimum version | Check                     |
|---------------|-----------------|---------------------------|
| Docker Desktop| 4.x             | `docker --version`        |
| Docker Compose| v2              | `docker compose version`  |
| Git           | any             | `git --version`           |

> If you want to run without Docker, you additionally need:
> Python 3.10+, PostgreSQL 14+, Redis 7+

---

## Step 1 — Get the code

```bash
git clone <your-repo-url>
cd marketing-agent
```

---

## Step 2 — Get a Gemini API key

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **Create API key**
3. Copy the key — you will need it in the next step

The free tier is enough to test the system.

---

## Step 3 — Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` in any editor and fill in:

```env
# Required
GOOGLE_API_KEY=AIza...your_key_here...

# Optional — change these if you want different defaults
GOOGLE_MODEL=gemini-2.0-flash
POSTGRES_PASSWORD=secret
```

Everything else can be left blank for now.

---

## Step 4 — Start the stack

```bash
docker compose up --build
```

First run takes 2–3 minutes to download images and build the app container.

You should see:

```
postgres_1  | database system is ready to accept connections
redis_1     | Ready to accept connections
api_1       | INFO:     Application startup complete.
worker_1    | [Worker]: starting, polling Redis queue...
```

---

## Step 5 — Verify everything is running

```bash
curl http://localhost:8080/health
```

Expected:

```json
{"status": "ok"}
```

Open the API docs in your browser:

```
http://localhost:8080/docs
```

---

## Step 6 — Run your first campaign

### Option A — API (browser or curl)

```bash
curl -X POST http://localhost:8080/run-campaign \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Productivity tools for remote teams",
    "platforms": ["LinkedIn", "Twitter"],
    "outputs": ["blog", "social"]
  }'
```

The response includes the full `assets` object with all generated content.

### Option B — CLI (interactive)

```bash
docker compose exec api python main.py
```

Or locally (if running without Docker):

```bash
python main.py
```

Follow the prompts:

```
Send Request to Marketing Director:
> Productivity tools for remote teams

Which platforms? (comma-separated, or 'all')
> linkedin, twitter

Which outputs? (comma-separated, or 'all')
> blog, social
```

---

## Step 7 — Check the outputs

Generated content is saved in two places:

**File system:**

```bash
ls outputs/
# productivity_tools_for_remote_<uuid>.json
```

**PostgreSQL:**

```bash
docker compose exec postgres psql -U postgres -d marketing_agent -c "SELECT campaign_uuid, user_input, status FROM campaigns;"
```

---

## Stopping and restarting

```bash
# Stop (keep all data)
docker compose down

# Restart
docker compose up

# Full reset (delete all data)
docker compose down -v
docker compose up --build
```

---

## Enabling publisher integrations (optional)

To actually publish content to social platforms, add the relevant API keys to `.env`:

```env
# Twitter/X
TWITTER_API_KEY=...

# LinkedIn
LINKEDIN_ACCESS_TOKEN=...

# Instagram (Meta Graph API)
META_ACCESS_TOKEN=...

# WordPress
WP_URL=https://yourblog.com
```

Then restart:

```bash
docker compose up
```

The Publisher agent will automatically pick them up.
See `tools/publisher_tools.py` to replace the stubs with real API calls.

---

## Running without Docker

If you prefer to run locally without Docker:

```bash
# 1. Create and activate virtualenv
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # Windows
source .venv/bin/activate       # macOS / Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure .env
cp .env.example .env
# Set GOOGLE_API_KEY at minimum
# Set DATABASE_URL and REDIS_URL if you have local Postgres/Redis

# 4. Run
python main.py        # CLI
uvicorn api:app --reload --port 8080   # API
python worker.py      # Worker (needs Redis)
```

> Without `DATABASE_URL` set, campaigns are saved to `outputs/*.json` only.
> Without `REDIS_URL` reachable, async mode is disabled but sync mode works fine.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `GOOGLE_API_KEY not found` warning | Make sure `.env` exists and contains the key |
| `api` container crashes on startup | Check `docker compose logs api` — usually a missing env var |
| No output generated | Verify your Gemini API key is valid and has quota |
| `UnicodeEncodeError` in Windows terminal | Run in Windows Terminal or VS Code terminal instead of cmd.exe |
| Port 8080 already in use | Change `"8080:8080"` to `"8081:8080"` in `docker-compose.yml` |
| Port 5432 already in use (local Postgres) | Change `"5432:5432"` to `"5433:5432"` in `docker-compose.yml` |

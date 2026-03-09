# AI Content Factory

A production-grade multi-agent system that turns a single topic into a complete content campaign — blog posts, social media packages, video scripts, image prompts — and publishes them automatically.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Agent Pipeline](#agent-pipeline)
- [Project Structure](#project-structure)
- [Quick Start — Docker (recommended)](#quick-start--docker-recommended)
- [Quick Start — Local](#quick-start--local)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [CLI Usage](#cli-usage)
- [Background Worker](#background-worker)
- [Database Schema](#database-schema)
- [Adding a Publisher Integration](#adding-a-publisher-integration)
- [Roadmap](#roadmap)

---

## Overview

```
One topic  →  Research + Trends  →  Strategy  →  Content (parallel)  →  Review  →  Publish  →  Analytics
```

The system is built on **LangGraph** with a deterministic queue-based orchestrator. Every agent writes structured output into a shared state that is persisted to **PostgreSQL** at the end of each campaign.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INPUT LAYER                                 │
│              CLI (main.py)  ·  REST API (api.py)                    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                     ┌─────▼──────┐
                     │  Planner   │  Builds execution queue + parallel groups
                     └─────┬──────┘
                           │
                    ┌──────▼───────┐
                    │  Supervisor  │  Deterministic router (no LLM cost)
                    └──────┬───────┘
                           │
          ┌────────────────▼────────────────┐
          │         SEQUENTIAL PHASE        │
          │  Researcher → TrendDetector     │
          │         → Strategist            │
          └────────────────┬────────────────┘
                           │
          ┌────────────────▼────────────────┐
          │          PARALLEL PHASE         │
          │  BlogWriter  InstagramWriter    │
          │  LinkedInWriter  TikTokWriter   │
          │  TwitterWriter   VideoScript    │
          │  ImagePromptWriter              │
          └────────────────┬────────────────┘
                           │
          ┌────────────────▼────────────────┐
          │        FINALIZATION PHASE       │
          │  Reviewer → Publisher           │
          │          → Analytics            │
          └────────────────┬────────────────┘
                           │
          ┌────────────────▼────────────────┐
          │           PERSISTENCE           │
          │  PostgreSQL (campaigns/assets)  │
          │  Redis (session cache)          │
          │  outputs/*.json (file backup)   │
          └─────────────────────────────────┘
```

### Infrastructure Services

| Service    | Image                | Purpose                              | Port  |
|------------|----------------------|--------------------------------------|-------|
| postgres   | postgres:16-alpine   | Campaign + asset metadata storage    | 5432  |
| redis      | redis:7-alpine       | Job queue + short-term session cache | 6379  |
| api        | (built from source)  | FastAPI REST endpoints               | 8080  |
| worker     | (built from source)  | Redis queue consumer (×2 replicas)   | —     |

---

## Agent Pipeline

| Agent              | Phase      | What it does                                                     |
|--------------------|------------|------------------------------------------------------------------|
| Planner            | Sequential | Turns topic into a structured plan + execution queue            |
| Supervisor         | Routing    | Pops queue items, fans out parallel groups — zero LLM cost      |
| Researcher         | Sequential | Live web search → compact market research brief                 |
| TrendDetector      | Sequential | Google Trends + Reddit + Twitter signals → trend report         |
| Strategist         | Sequential | Research + trends → unified cross-platform strategy             |
| BlogWriter         | Parallel   | SEO markdown blog post                                          |
| InstagramWriter    | Parallel   | Captions, reel script, carousel outline, hashtags               |
| LinkedInWriter     | Parallel   | Post variations, carousel outline, article/poll                 |
| TikTokWriter       | Parallel   | Scripts with timestamps, sounds, trend tie-ins                  |
| TwitterWriter      | Parallel   | Tweet variations, thread, poll, engagement prompts              |
| VideoScriptWriter  | Parallel   | YouTube-style script + shorts repurposing notes                 |
| ImagePromptWriter  | Parallel   | Thumbnail, blog, and social visual prompts                      |
| Reviewer           | Sequential | Policy checks + publish-readiness verdict                       |
| Publisher          | Sequential | Prepares platform payloads (Twitter, LinkedIn, Instagram, WP)   |
| Analytics          | Sequential | Simulated metrics → performance score → stored for future use   |

---

## Project Structure

```
marketing-agent/
│
├── agents/                  # One file per agent
│   ├── common.py            # Shared helpers (invoke_text_agent, build_message …)
│   ├── planner.py
│   ├── supervisor.py
│   ├── researcher.py
│   ├── trend_detector.py
│   ├── strategy.py
│   ├── blog_writer.py
│   ├── instagram_writer.py
│   ├── linkedin_writer.py
│   ├── tiktok_writer.py
│   ├── twitter_writer.py
│   ├── video_script_writer.py
│   ├── image_prompt_writer.py
│   ├── reviewer.py
│   ├── publisher.py
│   └── analytics.py
│
├── core/
│   ├── config.py            # Environment variables
│   ├── state.py             # LangGraph AgentState (TypedDict)
│   ├── engine.py            # Graph construction (nodes + edges)
│   ├── pipeline.py          # run_campaign(), stream_campaign(), persist_campaign_outputs()
│   ├── llm.py               # Gemini model factory
│   ├── db.py                # SQLAlchemy models (CampaignRecord, AssetRecord)
│   ├── persistence.py       # Upsert campaign + assets to PostgreSQL
│   ├── memory.py            # Redis short-term + PostgreSQL long-term memory
│   └── queue.py             # Redis job queue (enqueue / status)
│
├── prompts/
│   └── agent_prompts.py     # System prompts for every agent
│
├── tools/
│   ├── search.py            # DuckDuckGo web search
│   ├── trends.py            # Google Trends / Reddit / Twitter signals (mock)
│   ├── analytics.py         # SEO keywords + content policy check
│   ├── platform_tools.py    # Platform specs, hashtags, trending sounds
│   └── publisher_tools.py   # Twitter, LinkedIn, Instagram, WordPress stubs
│
├── main.py                  # Interactive CLI
├── api.py                   # FastAPI app
├── worker.py                # Redis queue worker
│
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

---

## Quick Start — Docker (recommended)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Clone and configure

```bash
git clone <your-repo-url>
cd marketing-agent

cp .env.example .env
```

Open `.env` and set your API key:

```env
GOOGLE_API_KEY=your_gemini_api_key_here
```

### 2. Start all services

```bash
docker compose up --build
```

Wait until you see:

```
api_1     | INFO:     Application startup complete.
worker_1  | [Worker]: starting, polling Redis queue...
```

### 3. Verify

```bash
curl http://localhost:8080/health
# {"status":"ok"}
```

### 4. Run your first campaign (sync)

```bash
curl -X POST http://localhost:8080/run-campaign \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "AI tools for developers",
    "platforms": ["Twitter", "LinkedIn"],
    "outputs": ["social", "blog"]
  }'
```

### 5. Run a campaign asynchronously (via Redis queue)

```bash
# Enqueue
curl -X POST http://localhost:8080/run-campaign \
  -H "Content-Type: application/json" \
  -d '{"topic": "AI tools for developers", "async_mode": true}'

# Returns: {"mode":"async","job":{"job_id":"abc-123", "status":"queued", ...}}

# Poll status
curl http://localhost:8080/job/abc-123
```

### Stop

```bash
docker compose down          # stop, keep volumes
docker compose down -v       # stop and delete all data
```

---

## Quick Start — Local

### Prerequisites

- Python 3.10+
- PostgreSQL 14+ running locally (or skip — DB persistence is optional)
- Redis running locally (or skip — queue and session cache gracefully degrade)

### 1. Create virtual environment

```bash
cd marketing-agent
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env — set GOOGLE_API_KEY at minimum
```

### 4. Run CLI

```bash
python main.py
```

### 5. Run API

```bash
uvicorn api:app --reload --port 8080
```

### 6. Run worker (optional, requires Redis)

```bash
python worker.py
```

---

## Environment Variables

| Variable               | Required | Default                          | Description                              |
|------------------------|----------|----------------------------------|------------------------------------------|
| `GOOGLE_API_KEY`       | Yes      | —                                | Google Gemini API key                    |
| `GOOGLE_MODEL`         | No       | `gemini-2.0-flash`               | Gemini model name                        |
| `POSTGRES_PASSWORD`    | No       | `secret`                         | PostgreSQL password (Docker only)        |
| `DATABASE_URL`         | No       | —                                | Full SQLAlchemy connection string        |
| `REDIS_URL`            | No       | `redis://localhost:6379/0`       | Redis connection URL                     |
| `TWITTER_API_KEY`      | No       | —                                | Enables Twitter/X publishing             |
| `LINKEDIN_ACCESS_TOKEN`| No       | —                                | Enables LinkedIn publishing              |
| `META_ACCESS_TOKEN`    | No       | —                                | Enables Instagram publishing             |
| `WP_URL`               | No       | —                                | Enables WordPress blog publishing        |

> If `DATABASE_URL` is not set, campaign results are saved as JSON files in `outputs/` only.
> If `REDIS_URL` is unreachable, the async queue is disabled and campaigns run synchronously.

---

## API Reference

### `GET /health`

Returns service status.

```json
{"status": "ok"}
```

---

### `POST /run-campaign`

Run a campaign synchronously or enqueue it asynchronously.

**Request body:**

```json
{
  "topic": "string",
  "platforms": ["Instagram", "LinkedIn", "TikTok", "Twitter"],
  "outputs": ["blog", "social", "video", "images"],
  "async_mode": false
}
```

| Field        | Type     | Default                                       | Description                                  |
|--------------|----------|-----------------------------------------------|----------------------------------------------|
| `topic`      | string   | required                                      | The campaign brief or topic                  |
| `platforms`  | string[] | all four platforms                            | Target social platforms                      |
| `outputs`    | string[] | `["blog","social","video","images"]`          | Content types to generate                    |
| `async_mode` | boolean  | `false`                                       | `true` = enqueue to Redis, return job_id     |

**Sync response:**

```json
{
  "mode": "sync",
  "campaign_id": "uuid",
  "plan": { ... },
  "assets": {
    "research": "...",
    "trend_report": "...",
    "strategy": { ... },
    "blog_post": "...",
    "social": {
      "Instagram": "...",
      "LinkedIn": "...",
      "TikTok": "...",
      "Twitter": "..."
    },
    "video_script": "...",
    "image_prompts": "...",
    "review": "...",
    "publish_manifest": { ... },
    "analytics": { ... }
  },
  "output_file": "outputs/topic_uuid.json",
  "database": { "saved": true, "campaign_row_id": 1, "asset_rows": 9 }
}
```

**Async response:**

```json
{
  "mode": "async",
  "job": {
    "job_id": "uuid",
    "status": "queued",
    "user_input": "..."
  }
}
```

---

### `GET /job/{job_id}`

Poll the status of an async campaign job.

```json
{
  "job_id": "uuid",
  "status": "completed",
  "campaign_id": "uuid",
  "output_file": "outputs/topic_uuid.json"
}
```

Possible statuses: `queued` · `running` · `completed` · `failed` · `no_redis`

---

## CLI Usage

```bash
python main.py
```

```
=================================================================
AI Content Factory - Multi-Agent Marketing System
=================================================================

Send Request to Marketing Director:
> AI tools for developers

Which platforms? (comma-separated, or 'all' for all platforms)
   Options: instagram, linkedin, tiktok, twitter
> linkedin, twitter

Which outputs? (comma-separated, or 'all')
   Options: blog, social, video, images
> all
```

Platform shortcuts: `ig` · `insta` → Instagram · `li` → LinkedIn · `tt` → TikTok · `x` · `tweet` → Twitter

Type `q` or `quit` to exit.

Output files are saved to `outputs/<topic>_<campaign_id>.json`.

---

## Background Worker

The worker polls Redis for queued jobs and runs the full pipeline for each one.

```bash
# Local
python worker.py

# Docker (already running as a service with 2 replicas)
docker compose up worker
```

Scale workers in Docker:

```bash
docker compose up --scale worker=4
```

---

## Database Schema

### `campaigns` table

| Column             | Type        | Description                            |
|--------------------|-------------|----------------------------------------|
| `id`               | integer PK  | Auto-increment row ID                  |
| `campaign_uuid`    | varchar     | UUID from pipeline (unique, indexed)   |
| `user_input`       | text        | Original campaign topic                |
| `status`           | varchar     | `completed` / `failed`                 |
| `target_platforms` | jsonb       | Array of platform names                |
| `requested_outputs`| jsonb       | Array of output types                  |
| `plan`             | jsonb       | Full planner output incl. perf. score  |
| `completed_steps`  | jsonb       | List of agent steps that ran           |
| `created_at`       | timestamptz | Auto-set on insert                     |
| `updated_at`       | timestamptz | Auto-updated on change                 |

### `assets` table

| Column        | Type        | Description                                      |
|---------------|-------------|--------------------------------------------------|
| `id`          | integer PK  | Auto-increment row ID                            |
| `campaign_id` | integer FK  | References `campaigns.id`                        |
| `asset_type`  | varchar     | `research` · `strategy` · `blog_post` · `social` · `video_script` · `image_prompts` · `review` · `publish_manifest` · `analytics` |
| `asset_name`  | varchar     | For social: platform name. Others: same as type. |
| `content`     | jsonb       | Asset content (text wrapped in `{"text": "..."}` or structured dict) |
| `created_at`  | timestamptz | Auto-set on insert                               |

Tables are created automatically on first startup via `Base.metadata.create_all()`.

---

## Adding a Publisher Integration

1. Open `tools/publisher_tools.py`
2. Find the stub for your platform (e.g. `publish_to_twitter`)
3. Replace the body with a real API call:

```python
# Example: Twitter via Tweepy
import tweepy

@tool
def publish_to_twitter(content: str, campaign_id: str) -> str:
    client = tweepy.Client(bearer_token=os.getenv("TWITTER_BEARER_TOKEN"))
    response = client.create_tweet(text=content[:280])
    return json.dumps({"status": "published", "tweet_id": response.data["id"]})
```

4. Set the corresponding env variable (`TWITTER_API_KEY`, `LINKEDIN_ACCESS_TOKEN`, etc.)
5. The Publisher agent will automatically use it on the next campaign run.

---

## Roadmap

- [ ] `pgvector` extension for semantic campaign similarity search
- [ ] Alembic migrations for schema versioning
- [ ] Real Google Trends / Reddit / Twitter API connections
- [ ] Actual image generation (DALL-E / Stable Diffusion) via Image agent
- [ ] Short-form video script → actual video via Runway / Pika
- [ ] Grafana + Prometheus metrics dashboard
- [ ] Webhook support for async campaign completion notifications

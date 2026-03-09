# Agent Reference

Details on every agent in the pipeline — what it does, what it reads, what it writes.

---

## Planner

**File:** `agents/planner.py`

Turns the raw topic into a structured execution plan.

**Reads:**
- `user_input`
- `target_platforms`
- `requested_outputs`
- `analytics_context` (past campaign signals, if available)

**Writes:**
- `plan` — `CampaignPlan` dict (goal, audience, angle, key_points, flags)
- `execution_queue` — ordered list of steps including a `PARALLEL` token
- `parallel_groups` — list of content writer names to fan out simultaneously
- `assets.planner` — copy of plan for reference

**Cost:** 1 LLM call (structured output)

---

## Supervisor

**File:** `agents/supervisor.py`

Routes the workflow by reading the execution queue — no LLM call.

**Logic:**
1. Skip any step already in `completed_steps`
2. If next step is `PARALLEL` → fan out all writers via `Send` API
3. Otherwise → set `next` to the step name
4. If queue empty → set `next` to `FINISH`

**Cost:** 0 LLM calls

---

## Researcher

**File:** `agents/researcher.py`

Runs a live web search and compresses results into a reusable research brief.

**Tools used:** `DuckDuckGoSearchResults`

**Writes:** `assets.research`

**Cost:** 1 search query + 1 LLM call

---

## TrendDetector

**File:** `agents/trend_detector.py`

Collects trend signals from multiple sources and produces a compact trend report.

**Tools used:** `get_google_trends`, `get_reddit_trends`, `get_twitter_trends`, `DuckDuckGoSearchResults`

**Writes:** `assets.trend_report`

**Cost:** 1 search query + 3 tool calls + 1 LLM call

> Mock data is returned when real API credentials are not configured.
> Production upgrade: connect `tools/trends.py` to pytrends, PRAW, and Twitter v2 API.

---

## Strategist

**File:** `agents/strategy.py`

Converts research + trends into a unified cross-platform strategy.

**Reads:** `assets.research`, `assets.trend_report`, `plan`, `analytics_context`

**Writes:** `assets.strategy` — structured `StrategyOutput`:
- `campaign_title`
- `audience`
- `positioning`
- `content_pillars`
- `call_to_action`
- `platform_hooks` — per-platform angle
- `repurposing_notes`
- `trend_angles`

**Cost:** 1 LLM call (structured output)

---

## BlogWriter

**File:** `agents/blog_writer.py`

Generates an SEO-optimized markdown blog post.

**Reads:** `assets.strategy`, `assets.research`, `assets.trend_report`

**Tools used:** `get_seo_keywords`

**Writes:** `assets.blog_post`

**Cost:** 1 tool call + 1 LLM call

---

## InstagramWriter

**File:** `agents/instagram_writer.py`

Creates a complete Instagram content package.

**Output includes:**
- 2 caption variations (A/B)
- Reel script with timestamps
- Carousel outline
- Hashtag set (popular + niche)

**Tools used:** `get_instagram_hashtags`, `get_platform_specs`

**Writes:** `assets.social.Instagram`

**Cost:** 2 tool calls + 1 LLM call

---

## LinkedInWriter

**File:** `agents/linkedin_writer.py`

Creates a professional LinkedIn content package.

**Output includes:**
- 2 post variations
- Carousel outline (PDF-style)
- Article or poll concept

**Tools used:** `get_platform_specs`, `get_seo_keywords`

**Writes:** `assets.social.LinkedIn`

**Cost:** 2 tool calls + 1 LLM call

---

## TikTokWriter

**File:** `agents/tiktok_writer.py`

Creates a viral TikTok content package.

**Output includes:**
- 2 scripts with timestamps and visual directions
- Caption ideas
- Trending sound suggestions
- Trend tie-ins

**Tools used:** `get_platform_specs`, `get_trending_sounds`, `get_seo_keywords`

**Writes:** `assets.social.TikTok`

**Cost:** 3 tool calls + 1 LLM call

---

## TwitterWriter

**File:** `agents/twitter_writer.py`

Creates a high-engagement Twitter/X content package.

**Output includes:**
- 2 single tweet variations (A/B)
- Thread (5–10 tweets)
- Poll idea
- Engagement prompts

**Tools used:** `get_platform_specs`, `get_seo_keywords`

**Writes:** `assets.social.Twitter`

**Cost:** 2 tool calls + 1 LLM call

---

## VideoScriptWriter

**File:** `agents/video_script_writer.py`

Creates a YouTube-style video script and short-form repurposing notes.

**Output includes:**
- Title + hook
- Section breakdown with talking points
- CTA
- Shorts / Reels repurposing notes

**Reads:** `assets.strategy`, `assets.research`, `assets.trend_report`, `assets.blog_post`

**Writes:** `assets.video_script`

**Cost:** 1 LLM call

---

## ImagePromptWriter

**File:** `agents/image_prompt_writer.py`

Generates production-ready prompts for image generation tools (DALL-E, Midjourney, Stable Diffusion).

**Output includes:**
- Thumbnail prompts
- Blog image prompts
- Social visual prompts

Each prompt specifies subject, composition, mood, text placement, and style.

**Reads:** `assets.strategy`, `assets.blog_post`

**Writes:** `assets.image_prompts`

**Cost:** 1 LLM call

---

## Reviewer

**File:** `agents/reviewer.py`

Runs content policy checks and issues a publish-readiness verdict.

**Checks:**
- `blog_post` policy
- Each social platform content policy
- `video_script` policy

**Writes:** `assets.review`

**Cost:** N policy tool calls (fast, no LLM) + 1 LLM call

---

## Publisher

**File:** `agents/publisher.py`

Prepares and dispatches content to platform APIs.

**Platforms handled:**
- Twitter/X → `publish_to_twitter`
- LinkedIn → `publish_to_linkedin`
- Instagram → `publish_to_instagram`
- WordPress (blog) → `publish_to_wordpress`

**Writes:** `assets.publish_manifest`

Each platform entry reports `status: ready` (credentials present) or `status: skipped` (no credentials).

**Cost:** N tool calls + 1 LLM call (validation)

---

## Analytics

**File:** `agents/analytics.py`

Evaluates campaign performance, computes a score, and stores it for future campaigns.

**Process:**
1. Simulate (or fetch real) engagement metrics per platform
2. Compute a performance score (0.0–1.0) from average CTR
3. Call LLM to extract learnings and recommendations
4. Update `campaigns.plan->>'performance_score'` in PostgreSQL
5. Future campaigns receive this score via `analytics_context`

**Writes:** `assets.analytics`

**Cost:** 1 LLM call + 1 DB write

> Production: replace `_simulate_metrics()` in `agents/analytics.py` with
> real calls to Google Analytics, Twitter Analytics, LinkedIn Analytics APIs.

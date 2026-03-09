# Architecture Deep Dive

This document explains every layer of the AI Content Factory in detail.

---

## 1. Execution Model

The system uses **LangGraph** to build a stateful directed graph.
Unlike typical chatbot pipelines, this graph is *not* conversational —
it is a **one-shot campaign execution machine** driven by a deterministic queue.

### How a campaign runs

```
1. User submits topic + platforms + outputs
2. build_initial_state() creates AgentState with a unique campaign_id
3. Planner calls the LLM once → produces CampaignPlan + execution_queue
4. Supervisor reads the queue top-down:
     - Sequential step  → route to that agent, wait for completion
     - PARALLEL token   → fan out all content writers simultaneously (Send API)
     - Queue empty      → FINISH
5. Each agent writes ONLY its delta into `assets`
   (merge_assets reducer merges all deltas safely)
6. persist_campaign_outputs() writes final state to PostgreSQL + file
```

### Why deterministic routing?

The original approach called the LLM on every routing decision.
This was replaced with a queue-based supervisor that costs **zero tokens** to route.
The LLM is only called inside agents that actually produce content.

---

## 2. State Design

`AgentState` (defined in `core/state.py`) is the single source of truth.

```python
class AgentState(TypedDict):
    messages           # append-only message history
    user_input         # original topic string
    campaign_id        # UUID for this campaign
    next               # current routing target
    target_platforms   # ["Instagram", "LinkedIn", ...]
    requested_outputs  # ["blog", "social", "video", "images"]
    execution_queue    # ["Researcher", "TrendDetector", "PARALLEL", "Reviewer", ...]
    parallel_groups    # [["BlogWriter", "InstagramWriter", ...]]
    completed_steps    # append-only list of finished agent names
    plan               # CampaignPlan dict from Planner
    assets             # all generated content (merge_assets reducer)
    analytics_context  # past campaign signals injected at start
```

### Asset merge strategy

Because parallel agents all write to `assets` simultaneously,
a custom reducer handles the merge:

```python
def merge_assets(a: dict, b: dict) -> dict:
    # "social" sub-dict is merged key-by-key (Instagram, LinkedIn, etc.)
    # all other keys are last-writer-wins
```

---

## 3. Agent Responsibilities

### Sequential agents

| Agent         | Input from state          | Output to state                    |
|---------------|---------------------------|-------------------------------------|
| Planner       | user_input                | plan, execution_queue, parallel_groups |
| Researcher    | user_input, plan          | assets.research                    |
| TrendDetector | user_input                | assets.trend_report                |
| Strategist    | research, trend_report    | assets.strategy                    |
| Reviewer      | all assets                | assets.review                      |
| Publisher     | social, blog, strategy    | assets.publish_manifest            |
| Analytics     | all assets, platforms     | assets.analytics                   |

### Parallel agents (all share the same inputs)

Every parallel agent reads from:
- `assets.strategy`
- `assets.research`
- `assets.trend_report`

And writes only its own slice:
- BlogWriter → `assets.blog_post`
- InstagramWriter → `assets.social.Instagram`
- LinkedInWriter → `assets.social.LinkedIn`
- TikTokWriter → `assets.social.TikTok`
- TwitterWriter → `assets.social.Twitter`
- VideoScriptWriter → `assets.video_script`
- ImagePromptWriter → `assets.image_prompts`

---

## 4. Tool Layer

Tools are plain LangChain `@tool` functions called **directly** (not via ReAct loops).
Each agent calls only the tools it needs, passes the result into a single LLM prompt,
and returns the answer. This avoids multiple tool-calling round trips.

| Tool file             | Tools                                                      |
|-----------------------|------------------------------------------------------------|
| `tools/search.py`     | `DuckDuckGoSearchResults`                                  |
| `tools/trends.py`     | `get_google_trends`, `get_reddit_trends`, `get_twitter_trends` |
| `tools/analytics.py`  | `get_seo_keywords`, `check_content_policy`                 |
| `tools/platform_tools.py` | `get_platform_specs`, `get_instagram_hashtags`, `get_trending_sounds` |
| `tools/publisher_tools.py` | `publish_to_twitter`, `publish_to_linkedin`, `publish_to_instagram`, `publish_to_wordpress` |

---

## 5. Persistence Layer

```
Campaign run finishes
        │
        ▼
persist_campaign_outputs()
    ├── save_campaign_outputs()          → outputs/<topic>_<id>.json
    ├── persist_campaign()               → PostgreSQL
    │     ├── campaigns table (upsert)
    │     └── assets table (delete + re-insert)
    └── store_campaign_knowledge()       → performance score into campaigns.plan JSONB
```

### Upsert logic

If a campaign is re-run (same `campaign_uuid`), the existing row is updated
and all asset rows are replaced. This makes re-runs idempotent.

---

## 6. Queue and Async Processing

```
POST /run-campaign  (async_mode=true)
        │
        ▼
enqueue_campaign()
        │
        ▼
Redis LIST "campaigns:queue"
        │
        ▼
worker.py  (blpop — blocking pop)
        │
        ▼
process_job()  →  run_campaign()  →  persist_campaign_outputs()
        │
        ▼
Redis KEY "campaign:status:<job_id>"  (TTL 24h)
        │
        ▼
GET /job/<job_id>  →  returns status
```

Scale workers by running multiple `python worker.py` processes
or via `docker compose up --scale worker=N`.

---

## 7. Memory

### Short-term (Redis)

- Key: `memory:session:<campaign_id>`
- Written at campaign start (`status: started`) and end (`status: completed`)
- TTL: 24 hours
- Use case: quick status lookup, retries, streaming checkpoints

### Long-term (PostgreSQL)

- Uses the existing `campaigns` table — no extra service needed
- `build_analytics_context(topic)` fetches the 3 most recent campaigns
- Performance score is stored in `campaigns.plan->>'performance_score'`
- Injected into `analytics_context` field of AgentState at campaign start
- Planner and Strategist read this to improve content angles

> **Future upgrade:** Add `pgvector` to enable semantic similarity search
> over past campaigns instead of simple recency ordering.

---

## 8. Cost Optimization Decisions

| Decision | Saving |
|---|---|
| Deterministic Supervisor (no LLM routing) | Removes 10–15 LLM calls per campaign |
| Single-call agents (no ReAct loops) | Each agent = exactly 1 LLM call |
| Shared research + trend data | All 7 parallel agents reuse the same upstream context |
| `gemini-2.0-flash` as default | ~10× cheaper than pro models |
| Batch generation per agent | Each agent produces multiple outputs in one prompt |
| Response caching (future) | Redis cache for repeated identical topics |

---

## 9. Adding a New Agent

1. Create `agents/my_agent.py`:

```python
from agents.common import build_message, invoke_text_agent
from core.state import AgentState
from prompts.agent_prompts import MY_AGENT_PROMPT

def my_agent_node(state: AgentState):
    result = invoke_text_agent(
        MY_AGENT_PROMPT,
        f"Topic: {state['user_input']}\n\nContext: {state['assets'].get('strategy', '')}",
    )
    return {
        "messages": build_message("MyAgent", result),
        "assets": {"my_output": result},
        "completed_steps": ["MyAgent"],
    }
```

2. Add the prompt to `prompts/agent_prompts.py`

3. Register the node in `core/engine.py`:

```python
from agents.my_agent import my_agent_node
builder.add_node("MyAgent", my_agent_node)
builder.add_edge("MyAgent", "Supervisor")
# add "MyAgent" to the routing dict in add_conditional_edges
```

4. Add it to the queue in `agents/planner.py` (`build_execution_plan`):

```python
# Sequential: add to sequential_pre or sequential_post
# Parallel: add to parallel_writers list
```

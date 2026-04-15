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
2. build_initial_state() creates AgentState with a unique campaign_id,
   default platforms/outputs, analytics_context, and saves a Redis session snapshot
3. Planner calls the LLM once → produces CampaignPlan + execution_queue + parallel_groups
4. Supervisor reads the queue top-down:
     - Sequential step  → set next agent and return to Supervisor after completion
     - PARALLEL token   → fan out content writers in the current parallel group via Send
     - Queue empty      → FINISH
5. Each agent writes ONLY its delta into `assets` and appends to `completed_steps`
   (merge_assets reducer merges all deltas safely)
6. persist_campaign_outputs() writes JSON output, persists DB records, updates session,
   stores campaign knowledge, and optionally stores RAG vectors
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
    messages: Annotated[Sequence[BaseMessage], operator.add]
    user_input: str
    campaign_id: str
    next: str
    target_platforms: list[str]
    requested_outputs: list[str]
    execution_queue: list[str]
    parallel_groups: list[list[str]]
    completed_steps: Annotated[list[str], operator.add]
    plan: dict[str, Any]
    assets: Annotated[dict[str, Any], merge_assets]
    analytics_context: dict[str, Any]
```

- `messages` stores the append-only LangChain message history.
- `target_platforms` and `requested_outputs` default to the platform/output lists from `core/pipeline.py`.
- `execution_queue` is built by the Planner and consumed by the Supervisor.
- `parallel_groups` groups concurrent writer steps for fan-out.
- `assets` is merged with `merge_assets()` so parallel social outputs do not overwrite each other.
- `analytics_context` is injected at campaign start from `core/memory.py`.

### Asset merge strategy

Because parallel agents all write to `assets` simultaneously,
a custom reducer handles the merge:

```python
def merge_assets(a: dict, b: dict) -> dict:
    if key == "social" and isinstance(value, dict):
        merged_social = dict(result.get("social", {}))
        merged_social.update(value)
        result["social"] = merged_social
    else:
        result[key] = value
```

- `social` is merged key-by-key, preserving platform-specific assets.
- all other top-level keys follow last-writer-wins semantics.

---

## 3. Agent Responsibilities

### Sequential agents

| Agent         | Input from state                         | Output to state                                |
|---------------|------------------------------------------|-------------------------------------------------|
| Planner       | user_input, requested_outputs, analytics_context | plan, target_platforms, execution_queue, parallel_groups, assets.planner |
| Researcher    | user_input, plan                         | assets.research                                 |
| TrendDetector | user_input                               | assets.trend_report                             |
| Strategist    | assets.research, assets.trend_report, analytics_context | assets.strategy                                 |
| Reviewer      | all assets                               | assets.review                                   |
| Publisher     | social, blog, strategy                    | assets.publish_manifest                         |
| Analytics     | all assets, target_platforms              | assets.analytics                                |

### Parallel agents (all share the same upstream context)

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

- Parallel writers are fan-out targets in `core/engine.py`.
- They return to `Supervisor` after completion, letting the graph continue.

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
    ├── store_campaign_knowledge()       → performance score into campaigns.plan JSONB
    ├── optional RAG vector write via core/rag
    └── save_session()                   → Redis short-term session update
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

- `core/queue.py` pushes jobs and stores status keys.
- `worker.py` polls the queue, executes the graph, and marks completion/failure.
- If Redis is unavailable, the queue layer falls back gracefully to support sync execution.

---

## 7. Memory

### Short-term (Redis)

- Key: `memory:session:<campaign_id>`
- Written at campaign start (`status: started`) and end (`status: completed`)
- TTL: 24 hours
- Use case: quick status lookup, retries, streaming checkpoints
- Stored by `core/memory.py::save_session()`

### Long-term (PostgreSQL + RAG)

- Uses the existing `campaigns` table plus optional ChromaDB vector search.
- `build_analytics_context(topic)` fetches semantically similar past campaigns,
  falling back to recency-based SQL if RAG is unavailable.
- The injected `analytics_context` can include:
  - `recent_campaigns`
  - `rag_enabled`
  - performance and preview signals
- `persist_campaign_outputs()` also calls `store_campaign_knowledge()` to persist
  the campaign's `performance_score` into `campaigns.plan`.
- `core/pipeline.py` optionally stores campaign vectors in `core/rag` if the module is available.

> **Future upgrade:** Add `pgvector` for PostgreSQL-based semantic search and tighter RAG integration.

---

## 8. Cost Optimization Decisions

| Decision | Saving |
|---|---|
| Deterministic Supervisor (no LLM routing) | Removes 10–15 LLM calls per campaign |
| Single-call agents (no ReAct loops) | Each agent = exactly 1 LLM call |
| Shared research + trend data | All parallel agents reuse the same upstream context |
| Planner structured output | Enforces valid CampaignPlan and reduces prompt error handling |
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

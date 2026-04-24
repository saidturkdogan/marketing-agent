# Agent Reference

The active agent implementation is Java-based under `apps/backend/src/main/java/com/marketingagent`.

## Workflow

`CampaignWorkflowRunner` runs ordered `AgentStep` implementations:

1. `PlannerStep`
2. `ResearchStep`
3. `StrategyStep`
4. `SocialWritersStep`
5. `ReviewerStep`
6. `AnalyticsStep`

## Core Packages

- `agent` - workflow steps
- `workflow` - deterministic runner
- `domain` - `CampaignState`
- `llm` - Gemini-compatible LLM abstraction
- `prompt` - prompt catalog
- `tool` - SEO, trends, platform specs, policy helpers
- `rag` - Java-native RAG storage and retrieval
- `publisher` - platform publishing clients
- `persistence` - JPA entities, repositories, converters, persistence service
- `controller` - REST API endpoints

Python agent files were removed during the full Java migration.

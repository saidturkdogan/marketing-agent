# Marketing API (Spring Boot)

Java-first backend foundation for the marketing agent.

## Run

```bash
cd apps/backend
mvn spring-boot:run
```

## Environment

- `DATABASE_URL` default: `jdbc:postgresql://localhost:5432/marketing_agent`
- `DATABASE_USER` default: `postgres`
- `DATABASE_PASSWORD` default: `secret`

## Key endpoints

- `POST /api/campaigns` (run workflow and persist output)
- `GET /api/campaigns/{campaignId}`
- `GET /api/jobs/{jobId}`
- `GET /api/health`

## Current architecture

- Agent workflow and orchestration run in Java (`CampaignWorkflowRunner` + `AgentStep`s).
- LLM integration is exposed through `LlmService` (`SpringAiCompatibleLlmService`).
- Persistence is handled via Spring Data JPA (`campaigns`, `assets`, `jobs`).

# Marketing Agent

Java-first marketing campaign backend with a Vite frontend.

## Architecture

- `apps/backend` - Spring Boot API, agent workflow, LLM client, JPA persistence, RAG storage, LinkedIn publisher
- `apps/frontend` - Vite UI that calls the Java API
- `docs` - migration and architecture notes

Python has been removed from the active application path.

## Run Backend

```bash
cd apps/backend
mvn spring-boot:run
```

Backend defaults:

- API port: `8080`
- Database URL: `jdbc:postgresql://localhost:5432/marketing_agent`
- User: `postgres`
- Password: `secret`

## Run Frontend

```bash
cd apps/frontend
npm install
npm run dev
```

## Configuration

Backend configuration lives in `apps/backend/src/main/resources/application.yml`.
For local overrides, use Spring profiles, environment variables, or your IDE run configuration.

## API

- `GET /api/health`
- `POST /api/campaigns`
- `GET /api/campaigns/{campaignId}`
- `GET /api/jobs/{jobId}`
- `POST /api/campaigns/{campaignId}/publish/linkedin`

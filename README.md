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
- Meta Graph version: `v25.0` (`META_GRAPH_VERSION`)

## Run Frontend

```bash
cd apps/frontend
npm install
npm run dev
```

## Run With Docker

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8080`
- PostgreSQL (`pgvector`): `localhost:5432`

Stop and remove containers:

```bash
docker compose down
```

To also remove database volume:

```bash
docker compose down -v
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
- `POST /api/campaigns/{campaignId}/publish/meta/instagram`
  - Body: `{"imageUrl":"https://public-cdn.example.com/image.jpg","caption":"optional override"}`
  - Requires `INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_IG_USER_ID`
  - Guardrail: campaign `review.status` must be `pass`

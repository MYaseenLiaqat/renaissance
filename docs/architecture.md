# Architecture

## Scope

Renaissance is a single student-facing web application plus an LLM research
instrument. The system is kept small and deliberately simple:

- **Tangled** is the single, self-hosted FastAPI application that owns the
  student-facing application, the instructor application, authentication, and
  course/topic/material/chat state. It also owns the rate limits, feedback
  loops, and the embedded tutor infrastructure.
- **AI Learning Research** is a separate, independent FastAPI service that owns
  the research learner, condition assignment, stages, assessments, controlled AI,
  and execution-based grading.
- The two systems are tangled together only at authentication boundary and at
  the backend-to-backend research-call boundary. There is no shared database,
  no shared ORM, and no frontend-visible service credentials.

The architecture assumes a single student-facing application. Students do not
use a separate research portal; the research instrument is embedded in the same
Tangled application and switched on/off with per-learner feature flags and
permission gates inside the Tangled backend.

## High-level components

| Component | Location | Role |
|---|---|---|
| Tangled backend | `apps/tangled/backend/app` | FastAPI app: auth, courses, topics, materials, retrieval, chat, analysis jobs, rate limits, profiling. |
| Tangled frontend | `apps/tangled/frontend` | React 18 + Vite + TypeScript. Student and instructor views in one codebase. |
| Research backend | `services/ai-learning-research/backend/app` | Independent FastAPI service. Own SQLite. Learners, tasks, attempts, AI interactions, scheduler, provenance. |
| Research frontend | `services/ai-learning-research/frontend` | Participant-facing view for the research instrument. |
| AI Learning Research service | `services/ai-learning-research` | Separate service. Communication is HTTP + `X-Renaissance-Service-Token`. |
| Database mapping | Tangled SQLite only | Maps one authenticated Tangled user to exactly one research learner. Maintained only by the Tangled backend. |

## Shared single application

- Tangled owns the domain model: `Instructor`, `Course`, `Concept`, `Student`,
  `Material`, `Message`, `AnalysisJob`, `QuizAggregate`, `QuizItem`,
  `QuizResponse`, `InsightGroup`, `Verdict`.
- Authentication is Tangled-only. The research service is reachable by
  authenticated credential via `X-Renaissance-Service-Token` (server-to-server),
  never by a browser session cookie and never from frontend JavaScript.
- Frontend code contains **no** API keys, no LLM provider keys, no database
  URLs, and no research service credentials.

## Research service boundary

- The research service owns a single SQLite database: `sqlite:///./research.db`
  (aligned with `DATABASE_URL` in `services/ai-learning-research/backend/.env`).
- The research service exposes its own public API: `/learners`, `/tasks`,
  `/learning`, `/ai`, and `/health`. Route names, payloads, and scheduling
  semantics are versioned in the service code and documented here as the
  authoritative research-side contract.
- The Tangled backend calls the research service with an HTTP `POST` to the
  learners creation endpoint and with an
  `Authorization: Bearer <legacy>` header. The header value is configured in the
  Tangled environment as `RESEARCH_SERVICE_TOKEN`. This is the only place the
  research service token is materialized in plaintext in configuration files.

## Data ownership

- **Tangled SQLite** (`apps/tangled/backend/data/tangled.db`): application
  state, users, courses, materials, chat history, quiz responses, learning
  materials, insights, analysis provenance.
- **Research SQLite** (`services/ai-learning-research/backend/data/research.db`):
  research learners, conditions, tasks, attempts, scores, AI interaction logs,
  scheduled assessments, and controlled-AI policy.
- The two databases are never joined in SQL. The only link is a
  backend-owned mapping between one authenticated Tangled user and one research
  learner ID, stored in a dedicated `learner_map` table in Tangled's SQLite.
  The research SQLite is never written from Tangled and never read by
  frontend code.

## Learner mapping rule

Each authenticated Tangled user owns exactly one research learner.

- The mapping table is `learner_map(user_id, research_learner_id,
  research_participation_status, created_at, updated_at)`.
- Either `user_id` or `research_learner_id` is unique, and the pair is marked
  unique so the combination can never duplicate.
- The Tangled backend is the only writer of this table. The research service
  never writes Tangled user records and never tells down to research ownership.
- A single Tangled user can have at most one active research learner. If a
  research learner must be recreated (see below), the Tangled backend replaces
  the old mapping and marks the old research learner withdrawn.

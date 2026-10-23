# Renaissance cleanup review

This is the Phase 2 inventory. No files are removed by this review. Existing
modified and untracked files are preserved.

## Required runtime files — KEEP

| Area | Paths | Evidence |
|---|---|---|
| Tangled API | `apps/tangled/backend/app/**`, `alembic/**`, `alembic.ini`, `requirements.txt` | Imported by `app.main`, migration startup, or test fixtures. |
| Tangled student frontend | `apps/tangled/frontend/**` | Vite entry point and the only intended student-facing application. |
| Research API | `services/ai-learning-research/backend/app/**`, `requirements.txt` | Independent FastAPI service and its route imports. |
| Service launch/config | `apps/tangled/Dockerfile`, `docker-compose.yml`, `docker-entrypoint.sh`, `nginx.conf`, backend Dockerfile | Referenced by deployment documentation and container startup. |

## Required tests — KEEP

- `apps/tangled/backend/tests/**`
- `apps/tangled/frontend/src/test/**`
- `services/ai-learning-research/backend/tests/**`

These are executable regression, protocol, security-boundary, and frontend
tests. They must not be replaced by demo-only checks.

## Required research and consent records — KEEP

- `services/ai-learning-research/research/**`, including `archive/**`
- `services/ai-learning-research/docs/RESEARCH.md`
- `apps/tangled/docs/CONSENT.md`, `SECURITY.md`, `DEPLOY.md`, and related docs
- `docs/architecture.md` and `docs/implementation-plan.md`

These contain protocol/version provenance, study instruments, consent,
controlled-AI restrictions, and historical records. They are not cleanup
candidates even where versions overlap.

## Required development/deployment configuration — KEEP

- `.env.example` files (templates only; secrets must not be committed)
- `pytest.ini`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`,
  `package.json`, `package-lock.json`
- CI workflow, scripts, READMEs, Alembic metadata, and seed data

## Generated/local artifacts — IGNORE or INVESTIGATE, do not delete in this phase

| Path | Decision | Evidence and references |
|---|---|---|
| `apps/tangled/frontend/node_modules/` | IGNORE | Package-manager output; not runtime source. Confirmed by `package-lock.json`; not tracked. |
| `apps/tangled/frontend/dist/` | IGNORE | Vite build output; served only when generated. Not source. |
| `**/__pycache__/`, `**/.pytest_cache/` | IGNORE | Python/test caches; generated and not imported or served. |
| `apps/tangled/backend/data/tangled.db` | INVESTIGATE / KEEP local | Local application data; deleting could remove user work. No deletion evidence. |
| `services/ai-learning-research/backend/research.db` | INVESTIGATE / KEEP | SQLite research data and potentially participant/provenance data. Explicitly protected from deletion. |
| `apps/tangled/backend/data/uploads/` | KEEP | User-uploaded course materials are served by the student API. |
| `apps/tangled/backend/.env`, `services/ai-learning-research/backend/.env` | KEEP local, never commit | Runtime secrets/configuration. Their presence is intentional; values must remain server-side. |

## Possible duplicates or obsolete files — INVESTIGATE

| Path | Decision | Evidence needed |
|---|---|---|
| `apps/tangled/README.txt` | INVESTIGATE | A similarly named `README.md` exists, but references, historical setup instructions, and content parity must be checked before removal. |
| `services/ai-learning-research/frontend/**` | INVESTIGATE / KEEP for now | It is not the student-facing frontend in the target architecture, but may be a research instrument or historical participant UI. No deletion without confirming protocol/deployment references. |
| `services/ai-learning-research/cline_implementation_brief_v0.1.md` | KEEP | Versioned implementation provenance; not an executable duplicate. |
| `services/ai-learning-research/research/archive/**` | KEEP | Explicit historical protocol/version records. |

## Removal decision

There is currently no candidate with sufficiently clear evidence for removal.
Generated artifacts should be ignored rather than deleting local data. The
cleanup phase may remove a file only after reference searches and documentation
review establish that it is neither imported, served, tested, documented,
participant-facing, nor user data.

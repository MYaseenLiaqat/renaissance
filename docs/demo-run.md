# Renaissance MVP demo run

The browser uses only the Tangled frontend and API. The research service is
called by Tangled's backend with `RESEARCH_SERVICE_TOKEN`; that token is never
sent to browser code.

## Configure

1. Copy `apps/tangled/backend/.env.example` to
   `apps/tangled/backend/.env`.
2. Copy `services/ai-learning-research/backend/.env.example` to
   `services/ai-learning-research/backend/.env`.
3. Set the same long random value for `RESEARCH_SERVICE_TOKEN` in Tangled and
   `RENAISSANCE_SERVICE_TOKEN` in the research service.
4. Set a non-default `JWT_SECRET` and an LLM configuration if tutor responses
   are part of the demo. Keep both `.env` files local.

## Start in three terminals

```powershell
cd D:\University\Projects\ai_projects\renaissance\services\ai-learning-research\backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

```powershell
cd D:\University\Projects\ai_projects\renaissance\apps\tangled\backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```powershell
cd D:\University\Projects\ai_projects\renaissance\apps\tangled\frontend
npm run dev
```

Open `http://localhost:5173`. An instructor creates a course, then the
student follows `/join/<join-code>`, registers with an email/password and
consent, opens the Loops activity, starts the Supported session, and submits
the scheduled assessment. Login and refresh reuse the persistent Tangled
student-to-research mapping.

## Verification

```powershell
cd D:\University\Projects\ai_projects\renaissance\apps\tangled\frontend
npm test -- --run
npm run build
cd D:\University\Projects\ai_projects\renaissance\apps\tangled\backend
python -m pytest -q
cd D:\University\Projects\ai_projects\renaissance\services\ai-learning-research\backend
python -m pytest -q
```

The research Python grader executes submitted code in a subprocess with
`python -I`; this is not a secure sandbox. Until OS/container isolation,
resource limits, filesystem isolation, and network restrictions are added, run
the demo only with trusted local participants and do not expose public
untrusted code execution.

# Renaissance
### AI that supports learning, not dependency.

Renaissance is an AI-supported learning and research platform designed to help students develop genuine understanding while giving instructors better visibility into potential learning difficulties.

Generative AI can help students complete tasks without necessarily improving their independent understanding or long-term retention. At the same time, instructors often lack timely evidence about recurring misconceptions and topics that require additional teaching support.

Renaissance addresses this challenge through course-grounded AI assistance, structured learning activities, follow-up assessments, and evidence-informed instructor insights.

> **Core principle:** Help students learn how to solve problems, not simply obtain answers.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Running the Application](#running-the-application)
- [Demo Workflow](#demo-workflow)
- [Testing](#testing)
- [Research and Data Integrity](#research-and-data-integrity)
- [Security and Limitations](#security-and-limitations)
- [Project Structure](#project-structure)
- [Current Scope and Future Directions](#current-scope-and-future-directions)
- [Contributing](#contributing)
- [License](#license)

## Overview

Renaissance brings together two complementary experiences:

**For students:** A learning workspace with course materials, an AI tutor, structured activities, and assessments designed to encourage understanding.

**For instructors:** A course overview and evidence-based insights that help identify topics where students may be experiencing difficulty and support decisions about what to revisit in class.

The initial focus is programming and computer science education, where students can encounter difficulties with concepts such as loops, iteration, indexing, variable scope, and algorithmic reasoning.

Renaissance is intended to support instructors' judgment, not replace it. Its signals indicate areas worth reviewing; they are not definitive diagnoses of student ability or understanding.

## Key Features

### Student learning workspace

- Access course materials and learning resources.
- Ask questions through an AI tutor designed to use relevant course content.
- Read explanations and work through programming concepts.
- Complete structured learning activities and assessments.
- Review learning progress through the student interface.

### Course-grounded AI tutor

- Uses course material as a grounding source for explanations.
- Supports conceptual questions and programming problem-solving.
- Provides a foundation for connecting AI assistance to the material being studied.
- Is designed to make learning support more relevant to the enrolled course.

The reliability of individual answers depends on the available course content, retrieval quality, model behavior, and configured AI services.

### Instructor insights

- View course-level learning indicators.
- Identify topics that may need additional attention.
- Inspect supporting student questions and evidence.
- Review recurring confusion patterns and relevant assessment evidence where available.
- Distinguish potential confusion from information-seeking questions.
- Record instructor decisions, such as addressing a topic in class or dismissing a flagged issue.

### Research-oriented architecture

Renaissance separates the main learning application from the research backend. This supports clearer ownership of application features, research-related data, and the services that connect them.

## How It Works

The platform follows a learning-support workflow:

1. **Learn:** Students study course material and use the AI tutor for assistance.
2. **Practice:** Students work through structured activities and assessments.
3. **Observe:** The platform processes available learning evidence and student questions.
4. **Identify:** Potentially difficult topics are surfaced for instructor review.
5. **Respond:** Instructors inspect the evidence and decide whether further teaching support is appropriate.
6. **Reinforce:** Students can revisit concepts and continue learning.

This workflow is intended to connect AI assistance with independent learning and instructor intervention, rather than treating task completion as sufficient evidence of understanding.

## Architecture

Renaissance consists of three primary application components.

```text
                  Students and Instructors
                            |
                            v
                  React + Vite Frontend
                       Port 5173
                            |
                            v
                  Tangled FastAPI Backend
                       Port 8000
                 /          |          \
                /           |           \
         Application     Student       Research
          Features        APIs          Client
                                          |
                                          v
                              AI Learning Research API
                                      Port 8001
                                          |
                                          v
                              Research Data and Services
```

### Component responsibilities

| Component | Responsibility |
|---|---|
| React frontend | Student and instructor interfaces, course materials, learning activities, and dashboards |
| Tangled backend | Main application API, course and student workflows, and communication with research services |
| AI Learning Research backend | Research-oriented APIs, research data operations, and supporting AI/research services |
| Database and retrieval services | Persistence and retrieval, according to each configured service |
| AI provider | Model-based assistance where an appropriate provider and credentials are configured |

The frontend communicates with the Tangled backend. The Tangled backend communicates with the separate research service for supported research operations.

The two backends should be configured and started independently. Keep service credentials and database configuration on the server side.

## Technology Stack

The project uses the following technologies in its current implementation:

- **Frontend:** React, TypeScript, Vite
- **Application backend:** Python, FastAPI
- **Research backend:** Python, FastAPI
- **Data and persistence:** SQLModel/SQLAlchemy-based application data models and SQLite research storage in the documented local configuration
- **AI and retrieval:** Course-grounded AI and retrieval services, with provider-specific configuration
- **Testing:** pytest for backend tests and the frontend's configured test tooling
- **Version control:** Git and GitHub

Exact dependencies and supported versions should be taken from the relevant project manifests and environment examples.

## Getting Started

### Prerequisites

Install the following before running Renaissance:

- Git
- Python and pip, using a version supported by the backend dependency files
- Node.js and npm, using a version supported by the frontend project
- Any AI provider credentials required for the features you intend to test

You should also have access to the required course materials and the configured local demo data if you want to reproduce the demonstration.

### 1. Clone the repository

```powershell
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd renaissance
```

Replace the placeholder with the actual repository URL.

### 2. Configure the research backend

Open the research backend directory:

```powershell
cd services\ai-learning-research\backend
```

Review the available environment example and configuration before starting the service. Create a local `.env` file based on `.env.example` if the project configuration requires it.

Install the dependencies using the repository's actual dependency manifest. For example, if it contains `requirements.txt`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Return to the repository root when finished:

```powershell
cd ..\..\..
```

### 3. Configure the Tangled backend

Open the application backend:

```powershell
cd apps\tangled\backend
```

Create and activate its virtual environment if one does not already exist:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install dependencies using the manifest present in this directory. If it uses `requirements.txt`:

```powershell
python -m pip install -r requirements.txt
```

Configure its local environment using the environment example and backend configuration. Ensure that the research service URL and any required service credentials match your local setup.

Return to the repository root:

```powershell
cd ..\..\..
```

### 4. Install frontend dependencies

```powershell
cd apps\tangled\frontend
npm install
```

Configure any frontend environment variables documented by the frontend project. Never place private AI-provider keys or backend service secrets in frontend variables.

## Running the Application

Run each service in a separate PowerShell terminal from the repository root.

### Terminal 1 — Research backend

```powershell
cd services\ai-learning-research\backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8001
```

### Terminal 2 — Tangled application backend

```powershell
cd apps\tangled\backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```

### Terminal 3 — Frontend

```powershell
cd apps\tangled\frontend
npm run dev
```

Open the local frontend URL printed by Vite, normally `http://localhost:5173`.

**Important:** These commands assume the respective backend applications expose `app.main:app` and that their virtual environments and dependencies have been set up as described. If your current branch uses a different entry point, startup command, or environment variable, follow the configuration in that component's source and project files.

Keep all three terminals running while using the complete local application.

## Demo Workflow

A suggested demonstration sequence is:

1. Open the instructor overview and introduce the course-level learning indicators.
2. Select a topic that has been flagged for review.
3. Inspect the supporting questions and assessment evidence.
4. Explain how the evidence can help an instructor decide what to revisit.
5. Open the student workspace and show the course materials.
6. Ask the AI tutor a programming question grounded in the course content.
7. Demonstrate a learning activity or assessment.
8. Close by explaining how student support and instructor review fit together.

For the programming demonstration, useful questions include:

- Why does a `while` loop sometimes run indefinitely?
- Why must a counter be incremented inside the loop body?
- Why does `range(5)` stop before the value `5`?
- Why does Python slicing exclude the ending index?
- How can a loop find the first negative value in a list?

Use the actual course material and live application responses during the demonstration. Do not describe illustrative seed data as evidence from a completed university study.

## Testing

Run the tests using the dependencies and test configuration of each component.

### Frontend

```powershell
cd apps\tangled\frontend
npm test
npm run build
```

The frontend test suite and production build should both complete successfully before a release or demonstration.

### Tangled backend

```powershell
cd apps\tangled\backend
.\.venv\Scripts\Activate.ps1
python -m pytest
```

### AI Learning Research backend

```powershell
cd services\ai-learning-research\backend
.\.venv\Scripts\Activate.ps1
python -m pytest
```

Run these commands from the relevant component directories so that the correct dependencies, configuration, and test discovery rules are used.

A successful test run validates the behaviors covered by the tests; it does not, by itself, establish educational effectiveness, production security, or the validity of research conclusions.

## Research and Data Integrity

Renaissance is designed to surface evidence that can help instructors investigate learning difficulties. That evidence must be interpreted carefully.

- **Demo data:** Seeded or synthetic records are for demonstrating workflows. They must not be presented as real participant findings.
- **Learning signals:** A student's question or assessment result is not, by itself, proof of a misconception.
- **Instructor review:** Automated classifications should inform human review rather than make definitive judgments about students.
- **Privacy:** Student-level data should only be accessible to appropriately authorized users.
- **Evaluation:** Claims about learning gains, retention, or educational effectiveness require appropriate empirical evaluation.
- **Provenance:** Any dataset used for research should have documented origin, permissions, and limitations.

Before using Renaissance in a real educational study, establish an appropriate research protocol, participant consent process, data-retention policy, and institutional approval where required.

## Security and Limitations

Renaissance is a development and demonstration project unless and until its deployment has been separately reviewed and hardened.

- Keep `.env` files, API keys, database files, participant exports, and credentials out of version control.
- Use `.env.example` files for placeholder configuration only.
- Verify authentication, authorization, and service-to-service authentication before deploying.
- Review database migrations, access controls, and data-retention behavior before handling real student information.
- Treat uploaded documents, retrieved content, and student prompts as untrusted input.
- Do not expose private model-provider credentials in browser code.
- Do not use the application to make high-stakes decisions about students without appropriate validation and human oversight.
- Do not treat a basic subprocess-based code runner as a secure sandbox for untrusted code.
- Review AI-generated content for correctness, relevance, and appropriate course grounding.

Local ports, development credentials, and demo configuration are not production security controls.

## Project Structure

The principal application directories are:

```text
renaissance/
├── apps/
│   └── tangled/
│       ├── backend/
│       │   └── app/
│       └── frontend/
│           └── src/
├── services/
│   └── ai-learning-research/
│       └── backend/
├── docs/
├── scripts/
└── README.md
```

The repository may contain additional test, migration, configuration, and documentation files. Consult the relevant directories for their current implementation details.

## Current Scope and Future Directions

The initial scope focuses on programming and computer science education.

Potential next steps include:

- More rigorous evaluation of course-grounded tutor responses.
- Improved measurement of independent understanding and retention.
- Broader course-material ingestion and retrieval evaluation.
- Stronger privacy, authorization, and deployment controls.
- Instructor feedback loops for refining topic classifications.
- Evaluation with appropriately consented participants and documented methodology.
- Integration with university learning management systems through supported interfaces.

These are directions for further development, not claims that every capability is already implemented.

## Contributing

Contributions should preserve the project's core principle: AI should support learning rather than replace independent understanding.

Before submitting changes:

1. Keep application and research service responsibilities clearly separated.
2. Add or update tests for changed behavior.
3. Run the relevant test suites and frontend build.
4. Keep secrets, private datasets, local databases, backups, and generated environments out of Git.
5. Document configuration changes and any new setup requirements.
6. Avoid introducing hardcoded demo results into production-facing learning insights.

## License

No license is specified here. Before reusing or distributing this project, check the repository for an existing license or add an appropriate license that reflects the maintainers' intentions.

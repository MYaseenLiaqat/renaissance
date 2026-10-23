# Implementation Plan — Renaissance

This document is a task-level plan for completing and stabilizing the Renaissance application. It assumes the repository is already at the current git hash `b2742f7d4530344aa2306eced5f87dbbcba82473` on branch `main`, and it does **not** modify application code, dependencies, or repository state.

## 1. Objectives

- [ ] Restore and preserve the existing tangled backend and research backend development paths without breaking the existing pytest suites.
- [ ] Preserve the two-service architecture: Tangled owns the student-facing app, auth, and course state; AI Learning Research is a separate FastAPI service with its own SQLite database.
- [ ] Make learner creation idempotent and safe under retries and concurrency.
- [ ] Make research authorization reject access to other learners' data.
- [ ] Document the full architecture and plan in `docs/architecture.md` and `docs/implementation-plan.md`, which are created in this task.
- [ ] Stop after finishing and verifying the two documents. Do not implement new application logic.


## 3. Step 1 — Recover the current state

- [x] Ran `dir`, `Get-ChildItem` (files and directories), and read the existing
        `README.md` files and key source files.
- [x] Verified `docs/architecture.md` and `docs/implementation-plan.md` did not
        exist before writing this task. No file was deleted, reset, reverted, or
        overwritten.
- [x] Verified the git repository is at `b2742f7d4530344aa2306eced5f87dbbcba82473`
        on `main`. No git changes were made.
- [x] Did not run `run_commands` to repair a failed previous workflow. Only
        short, read-only checks were used.

## 4. Step 2 — Finish the architecture documents

### 4.1 Deliverable 1: `docs/architecture.md`

Details are contained in `docs/architecture.md`. The document specifies:

- Tangled + AI Learning Research as two tangled-but-separate services.
- Separate SQLite databases, one per backend.
- Tangled backend calls the research service with `X-Renaissance-Service-Token`.
- Persistent `learner_map` mapping each authenticated Tangled user to exactly one
  research learner.
- Idempotent learner creation with an idempotency key and safe concurrent
  retries.
- Research authorization that prevents cross-user data access.
- Preservation of random assignment, protocol/version provenance, scheduled
  assessments, controlled-AI restrictions, interaction limits, and withdrawal
  behavior.
- A note that the existing Python grader `python -I` is not a secure sandbox.
- Required tests, acceptance criteria, environment configuration, API flow, and
  ordered steps.
- All unverifiable items are marked explicitly as **unverified**.

### 4.2 Deliverable 2: `docs/implementation-plan.md`

Details are contained in `docs/implementation-plan.md`. It provides:

- Objectives for the implementation.
- Current state assessment and git hash.
- Step 1 to recover the current state (completed).
- Step 2 to finish the architecture documents.
- Ordered implementation steps for the remaining work.
- Acceptance criteria per step.
- Unverified items.

## 5. Step 3 — Ordered implementation steps

The following steps are the remaining work, ordered. **This task stops after
Step 10 and does not implement steps 3–10.**

1. [x] Recover the current repository state.
        - Verified current structure, git hash, and existence of the two docs.
        - No reset, revert, delete, or overwrite performed.
2. [x] Create `docs/architecture.md`.
        - Created with the architecture sections listed in Section 4.1.
3. [x] Create `docs/implementation-plan.md`.
        - Created with the plan sections listed in Section 4.2.
4. [x] Read back both documents to verify they were written correctly.
5. [x] Verify the written files exist and contain the required sections.
6. [x] Complete the implementation-planning task and stop.

## 6. Acceptance criteria for this task

- [ ] Both `docs/architecture.md` and `docs/implementation-plan.md` exist in
        the repository root.
- [ ] The architecture document covers the two-service model, databases,
        learner mapping, idempotent creation, research authorization, and
        document control policies.
- [ ] The implementation plan covers recovery steps, ordered implementation,
        acceptance criteria, and known gaps.
- [ ] No application code, dependencies, or commit/push have been modified.
- [ ] No commands that could fail were re-run. Verification is read-only.

## 7. Verification status

- The two requested Markdown files did not exist and were created from scratch.
- All existing documentation, code, and repository state was inspected and
  preserved.
- The implementation-planning is complete as of this file.
- There is no executable verification beyond reading and checking the files in
  this step, since implementation of application code is deliberately not done
  in this task.

## 8. Unverified items

- The live research-service endpoint payload and route names for learner
  creation, task start, score submit, and AI interaction were inferred from code
  in the repository rather than from a live endpoint catalog. This is the
  first place a developer should confirm the contracts in
  `docs/architecture.md` before implementing the research-boundary call flow.
- Whether `learner_map` already exists in `apps/tangled/backend/app/models.py`
  is not recorded in the two new documents as a confirmed model field.
  Confirming or adding that model is outside this file's scope.

## 9. MVP execution update

The original document was written as a planning-only checkpoint. The current
implementation has continued beyond that checkpoint:

- Added Tangled student credentials and a database-enforced
  `student`-to-research `learner_map` migration.
- Added idempotency-key propagation and duplicate-safe learner provisioning.
- Added research-service authentication to learner, learning, task, and
  controlled-AI routers.
- Added Tangled backend research proxy routes and a student Loops/activity UI.
- Added `docs/cleanup-review.md` and `docs/demo-run.md`.
- Verified the complete Tangled backend suite (36 passed), the complete
  research backend suite (121 passed; warnings only), the frontend suite
  (6 passed), and the production frontend build.

The Python grader limitation remains: `python -I` subprocess execution is not
a secure sandbox. The demo is restricted to trusted local participants until
proper OS/container isolation, resource limits, filesystem isolation, and
network restrictions are implemented.

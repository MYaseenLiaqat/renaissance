"""Seed research learners and attempts for demonstration cohort."""

import hashlib
import json
import secrets
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import SessionLocal
from app.models import Attempt, Concept, Learner, Task
from scripts.seed import seed as run_base_seed


def seed_research_cohort(students_data: list[dict]) -> list[dict]:
    db = SessionLocal()
    try:
        # 1. Ensure Concept and base Tasks exist
        if db.query(Concept).count() == 0 or db.query(Task).count() == 0:
            run_base_seed(db)

        concept = db.query(Concept).filter_by(name="Loops").first()
        tasks = {t.type: t for t in db.query(Task).filter_by(concept_id=concept.id).all()}

        results = []
        for s in students_data:
            idempotency_key = f"demo-student-{s['id']}"
            learner = db.query(Learner).filter_by(idempotency_key=idempotency_key).first()

            prov_token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(prov_token.encode()).hexdigest()

            is_ai = s["condition"] == "controlled_ai"
            if not learner:
                learner = Learner(
                    prior_ability_score=s.get("prior_ability", 0.7),
                    condition=s["condition"],
                    measurement_arm="full",
                    study_protocol_version="v0.4",
                    learning_module_version="v0.6.0",
                    system_prompt_version="0.6.0" if is_ai else None,
                    ai_provider="gemini" if is_ai else None,
                    ai_model="gemini-3.5-flash-lite" if is_ai else None,
                    ai_interaction_cap=8 if is_ai else None,
                    supported_phase_minutes=20,
                    participation_status="active",
                    idempotency_key=idempotency_key,
                    learner_access_token_hash=token_hash,
                )
                db.add(learner)
                db.commit()
                db.refresh(learner)

                # Create attempts for all active tasks
                for t_type, t_obj in tasks.items():
                    offset = t_obj.scheduled_offset_days or 0
                    sched = datetime.now(timezone.utc) + timedelta(days=offset)
                    att = Attempt(
                        learner_id=learner.id,
                        task_id=t_obj.id,
                        task_version=t_obj.version,
                        scheduled_for=sched,
                    )
                    db.add(att)
                db.commit()
            else:
                learner.learner_access_token_hash = token_hash
                db.commit()

            # Set realistic progress state
            now = datetime.now(timezone.utc)
            state = s.get("state", "not_started")
            supp_task = tasks.get("supported")
            imm_task = tasks.get("immediate")

            if supp_task:
                s_att = db.query(Attempt).filter_by(learner_id=learner.id, task_id=supp_task.id).first()
                if s_att:
                    if state in ("both_completed", "supported_done_immediate_progress", "supported_done_immediate_unlocked"):
                        s_att.started_at = now - timedelta(hours=2)
                        s_att.completed_at = now - timedelta(hours=1, minutes=45)
                        s_att.score = 1.0 if state != "supported_done_immediate_unlocked" else 0.83
                        s_att.submitted_code = (
                            "result = 0\n"
                            "for temp in temperatures:\n"
                            "    if temp > 30:\n"
                            "        result += 1"
                        )
                        s_att.graded_at = now - timedelta(hours=1, minutes=45)
                    elif state == "supported_in_progress":
                        s_att.started_at = now - timedelta(minutes=5)
                        s_att.completed_at = None

            if imm_task:
                imm_att = db.query(Attempt).filter_by(learner_id=learner.id, task_id=imm_task.id).first()
                if imm_att:
                    if state == "both_completed":
                        imm_att.started_at = now - timedelta(hours=1, minutes=30)
                        imm_att.completed_at = now - timedelta(hours=1, minutes=15)
                        imm_att.score = 1.0
                        imm_att.submitted_code = (
                            "result = 0\n"
                            "for score in scores:\n"
                            "    if score >= 50:\n"
                            "        result += 1"
                        )
                        imm_att.graded_at = now - timedelta(hours=1, minutes=15)
                    elif state == "supported_done_immediate_progress":
                        imm_att.started_at = now - timedelta(minutes=10)
                        imm_att.completed_at = None

            db.commit()
            results.append({
                "student_id": s["id"],
                "research_learner_id": learner.id,
                "provisioning_token": prov_token,
            })

        return results
    finally:
        db.close()


def unseed_research_cohort(student_ids: list[int]):
    db = SessionLocal()
    try:
        for sid in student_ids:
            key = f"demo-student-{sid}"
            learner = db.query(Learner).filter_by(idempotency_key=key).first()
            if learner:
                db.query(Attempt).filter_by(learner_id=learner.id).delete()
                db.delete(learner)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "seed"
    if action == "seed":
        raw = sys.stdin.read()
        students = json.loads(raw)
        res = seed_research_cohort(students)
        print(json.dumps(res))
    elif action == "unseed":
        raw = sys.stdin.read()
        sids = json.loads(raw)
        unseed_research_cohort(sids)
        print(json.dumps({"ok": True}))

import random
import secrets
import hashlib
from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.db import get_db
from app.config import settings
from app.models import Attempt, Learner
from app.schemas import LearnerCreate, LearnerOut
from app.services.scheduler import is_supported_completed_or_expired, seed_attempts
from app.services.learning_material import get_learning_module
from app.routers.ai import get_system_prompt, KNOWN_AI_PROVIDERS
from app.services.provenance import FrozenProvenanceError, require_common_provenance
from app.services.renaissance_auth import require_learner_access, require_renaissance_service
router = APIRouter(dependencies=[Depends(require_renaissance_service)])

@router.post(
    "",
    response_model=LearnerOut,
)
def create_learner(
    payload: LearnerCreate,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
):
    if idempotency_key:
        existing = db.query(Learner).filter_by(idempotency_key=idempotency_key).first()
        if existing:
            return existing
    condition = random.choice(["no_ai", "controlled_ai"])
    try:
        get_learning_module(settings.learning_module_version)
        if condition == "controlled_ai":
            get_system_prompt(settings.system_prompt_version)
            if settings.llm_provider not in KNOWN_AI_PROVIDERS:
                raise FrozenProvenanceError("Configured AI provider is unsupported")
            if not settings.llm_model:
                raise FrozenProvenanceError("Configured AI model is missing")
            if settings.ai_interaction_cap < 0:
                raise FrozenProvenanceError("Configured AI interaction cap is invalid")
        if settings.supported_phase_minutes <= 0:
            raise FrozenProvenanceError("Configured Supported duration is invalid")
    except (KeyError, FrozenProvenanceError) as exc:
        raise HTTPException(503, str(exc))
    provisioning_token = secrets.token_urlsafe(32)
    learner = Learner(
        prior_ability_score=payload.prior_ability_score,
        condition=condition,
        measurement_arm="full",
        study_protocol_version=settings.study_protocol_version,
        learning_module_version=settings.learning_module_version,
        system_prompt_version=(
            settings.system_prompt_version
            if condition == "controlled_ai"
            else None
        ),
        ai_provider=settings.llm_provider if condition == "controlled_ai" else None,
        ai_model=settings.llm_model if condition == "controlled_ai" else None,
        ai_interaction_cap=(
            settings.ai_interaction_cap if condition == "controlled_ai" else None
        ),
        supported_phase_minutes=settings.supported_phase_minutes,
        participation_status="active",
        idempotency_key=idempotency_key,
        learner_access_token_hash=hashlib.sha256(provisioning_token.encode()).hexdigest(),
    )
    db.add(learner)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if idempotency_key:
            existing = db.query(Learner).filter_by(idempotency_key=idempotency_key).first()
            if existing:
                return existing
        raise HTTPException(503, "Learner provisioning could not be completed safely.")
    db.refresh(learner)
    seed_attempts(db, learner)
    learner.provisioning_token = provisioning_token
    return learner

class LearnerStatusOut(BaseModel):
    learner_id: int
    participation_status: str
    has_future_assessments: bool
    next_assessment_at: datetime | None


@router.get("/{learner_id}", response_model=LearnerOut)
def get_learner(learner_id: int, x_renaissance_learner_token: str | None = Header(default=None), db: Session = Depends(get_db)):
    learner = db.get(Learner, learner_id)
    if not learner:
        raise HTTPException(404, "Learner not found")
    require_learner_access(learner, x_renaissance_learner_token)
    return learner


@router.get("/{learner_id}/status", response_model=LearnerStatusOut)
def get_learner_status(learner_id: int, x_renaissance_learner_token: str | None = Header(default=None), db: Session = Depends(get_db)):
    """Return whether the learner has future scheduled assessments.

    Used by the frontend to distinguish "return later" (future assessment
    exists) from "study complete" (nothing left). Does not unlock anything.
    """
    learner = db.get(Learner, learner_id)
    if not learner:
        raise HTTPException(404, "Learner not found")
    require_learner_access(learner, x_renaissance_learner_token)
    try:
        require_common_provenance(learner)
    except FrozenProvenanceError as exc:
        raise HTTPException(503, str(exc))

    future = (
        db.query(Attempt)
        .filter(
            Attempt.learner_id == learner_id,
            Attempt.scheduled_for > datetime.utcnow(),
            Attempt.completed_at.is_(None),
        )
        .order_by(Attempt.scheduled_for.asc())
        .first()
    )
    is_supported_completed_or_expired(db, learner_id)

    return LearnerStatusOut(
        learner_id=learner.id,
        participation_status=learner.participation_status,
        has_future_assessments=future is not None,
        next_assessment_at=future.scheduled_for if future else None,
    )


@router.post("/{learner_id}/withdraw")
def withdraw_learner(learner_id: int, x_renaissance_learner_token: str | None = Header(default=None), db: Session = Depends(get_db)):
    """Withdraw a learner from the research study.

    Marks participation_status as 'withdrawn' and prevents further research task tracking.
    """
    learner = db.get(Learner, learner_id)
    if not learner:
        raise HTTPException(404, "Learner not found")
    require_learner_access(learner, x_renaissance_learner_token)
    learner.participation_status = "withdrawn"
    db.commit()
    return {"ok": True, "learner_id": learner.id, "participation_status": "withdrawn"}

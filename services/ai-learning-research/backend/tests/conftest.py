import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import hashlib
import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.db import Base, get_db
from app.main import app
from app.models import Learner, Concept, Task, Attempt

TEST_LEARNER_TOKEN = "test-learner-access-token"
TEST_SERVICE_TOKEN = "test-renaissance-service-token"


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
    )
    session = TestingSession()
    Base.metadata.create_all(bind=engine)

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture()
def client(db_session, monkeypatch):
    monkeypatch.setattr(
        settings,
        "renaissance_service_token",
        TEST_SERVICE_TOKEN,
    )

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(
            app,
            headers={
                "X-Renaissance-Service-Token": TEST_SERVICE_TOKEN,
                "X-Renaissance-Learner-Token": TEST_LEARNER_TOKEN,
            },
        ) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


@pytest.fixture()
def service_client(db_session, monkeypatch):
    monkeypatch.setattr(
        settings,
        "renaissance_service_token",
        TEST_SERVICE_TOKEN,
    )

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(
            app,
            headers={
                "X-Renaissance-Service-Token": TEST_SERVICE_TOKEN,
            },
        ) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


@pytest.fixture()
def concept(db_session):
    concept = Concept(name="Loops", order=1)
    db_session.add(concept)
    db_session.commit()
    db_session.refresh(concept)
    return concept


@pytest.fixture()
def make_task(db_session, concept):
    def _make_task(task_type, offset_days=0):
        task = Task(
            concept_id=concept.id,
            type=task_type,
            prompt_text=f"Task {task_type}",
            grading_spec={
                "tests": [
                    {
                        "expression": "add(1,2)",
                        "expected": 3,
                    },
                ],
            },
            scheduled_offset_days=offset_days,
            version="0.5.0",
        )
        db_session.add(task)
        db_session.commit()
        db_session.refresh(task)
        return task

    return _make_task


@pytest.fixture()
def make_learner(db_session):
    def _make_learner(condition="controlled_ai", learner_token=TEST_LEARNER_TOKEN):
        token_hash = (
            hashlib.sha256(learner_token.encode("utf-8")).hexdigest()
            if learner_token
            else None
        )
        learner = Learner(
            prior_ability_score=0.5,
            condition=condition,
            measurement_arm="full",
            study_protocol_version="v0.3",
            learning_module_version="v0.6.0",
            system_prompt_version=(
                "0.6.0" if condition == "controlled_ai" else None
            ),
            ai_provider=(
                "groq" if condition == "controlled_ai" else None
            ),
            ai_model=(
                "fake-model" if condition == "controlled_ai" else None
            ),
            ai_interaction_cap=(
                8 if condition == "controlled_ai" else None
            ),
            supported_phase_minutes=20,
            participation_status="active",
            learner_access_token_hash=token_hash,
        )
        db_session.add(learner)
        db_session.commit()
        db_session.refresh(learner)
        learner.provisioning_token = learner_token
        return learner

    return _make_learner


@pytest.fixture()
def make_attempt(db_session):
    def _make_attempt(
        learner,
        task,
        scheduled_for=None,
        completed_at=None,
        started_at=None,
    ):
        attempt = Attempt(
            learner_id=learner.id,
            task_id=task.id,
            scheduled_for=scheduled_for or datetime.utcnow(),
            completed_at=completed_at,
            started_at=started_at,
            task_version=task.version,
        )
        db_session.add(attempt)
        db_session.commit()
        db_session.refresh(attempt)
        return attempt

    return _make_attempt

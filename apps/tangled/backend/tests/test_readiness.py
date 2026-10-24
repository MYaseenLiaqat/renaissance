import uuid
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from app.db import engine
from app.main import app
from app.models import Course, LearnerMap, Student, Material
from app.services.compaction import compact_history, extract_citations


def test_context_compaction_unit():
    # 1. Short dialogue (<= 4 messages / 2 turns) should remain uncompacted
    short_dialogue = [
        {"role": "user", "content": "What is a for loop?"},
        {"role": "assistant", "content": "A for loop iterates over a sequence [1]."},
    ]
    summary, verbatim = compact_history(short_dialogue, max_verbatim_turns=2)
    assert summary == ""
    assert len(verbatim) == 2

    # 2. Long dialogue (> 4 messages) should compact older turns and preserve recent verbatim turns
    long_dialogue = [
        {"role": "user", "content": "Explain index zero in Python."},
        {"role": "assistant", "content": "Python sequences are zero-indexed, starting from 0 [1]."},
        {"role": "user", "content": "What about negative indices?"},
        {"role": "assistant", "content": "Negative index -1 references the last element [2]."},
        {"role": "user", "content": "How does range(1, 5) work?"},
        {"role": "assistant", "content": "range(1, 5) produces 1, 2, 3, 4 without including 5 [3]."},
    ]
    summary, verbatim = compact_history(long_dialogue, max_verbatim_turns=1)
    assert "[Prior Conversation Compaction Summary]" in summary
    assert "Explain index zero in Python" in summary
    assert "[1]" in summary
    assert "[2]" in summary
    # Verbatim contains the last 2 messages (1 turn)
    assert len(verbatim) == 2
    assert verbatim[0]["content"] == "How does range(1, 5) work?"


def test_student_consent_and_withdrawal(monkeypatch):
    fake_learner_id = (uuid.uuid4().int % 1000000) + 2000
    fake_token = f"token-{fake_learner_id}"

    def mock_create_learner(prior_ability_score=None, idempotency_key=None):
        return {"id": fake_learner_id, "provisioning_token": fake_token}

    def mock_research_request(method, path, mapping, payload=None):
        if "withdraw" in path:
            return {"ok": True, "learner_id": mapping.research_learner_id, "participation_status": "withdrawn"}
        return {}

    monkeypatch.setattr("app.routers.student.create_research_learner", mock_create_learner)
    monkeypatch.setattr("app.routers.student.research_request", mock_research_request)

    with TestClient(app) as client:
        # Instructor setup
        inst_resp = client.post("/api/v1/auth/register", json={"email": f"inst-{uuid.uuid4().hex[:6]}@edu.org", "password": "password123"})
        token = inst_resp.json()["access_token"]
        course_resp = client.post("/api/v1/courses", headers={"Authorization": f"Bearer {token}"}, json={"name": "Consent Test Course"})
        course = course_resp.json()

        # Student registration
        st_email = f"st-{uuid.uuid4().hex[:6]}@edu.org"
        reg_resp = client.post("/api/v1/student/register", json={"email": st_email, "password": "password123", "code": course["join_code"], "consent": True})
        st_token = reg_resp.json()["access_token"]

        # Check consent status
        cons_resp = client.get("/api/v1/student/consent", headers={"Authorization": f"Bearer {st_token}"})
        assert cons_resp.status_code == 200
        cons_data = cons_resp.json()
        assert cons_data["is_participating"] is True
        assert cons_data["research_participation_status"] == "active"
        assert cons_data["can_withdraw"] is True

        # Withdraw consent
        withdraw_resp = client.post("/api/v1/student/consent/withdraw", headers={"Authorization": f"Bearer {st_token}"})
        assert withdraw_resp.status_code == 200
        assert withdraw_resp.json()["participation_status"] == "withdrawn"

        # Check updated consent status
        cons_resp2 = client.get("/api/v1/student/consent", headers={"Authorization": f"Bearer {st_token}"})
        assert cons_resp2.json()["is_participating"] is False
        assert cons_resp2.json()["research_participation_status"] == "withdrawn"


def test_student_courses_endpoint(monkeypatch):
    monkeypatch.setattr("app.routers.student.create_research_learner", lambda **k: {"id": 9999, "provisioning_token": "tok"})
    with TestClient(app) as client:
        inst = client.post("/api/v1/auth/register", json={"email": f"i-{uuid.uuid4().hex[:6]}@u.edu", "password": "password123"}).json()
        c = client.post("/api/v1/courses", headers={"Authorization": f"Bearer {inst['access_token']}"}, json={"name": "Algorithms & Logic"}).json()
        st = client.post("/api/v1/student/register", json={"email": f"st-{uuid.uuid4().hex[:6]}@u.edu", "password": "password123", "code": c["join_code"], "consent": True}).json()

        courses_resp = client.get("/api/v1/student/courses", headers={"Authorization": f"Bearer {st['access_token']}"})
        assert courses_resp.status_code == 200
        enrolled = courses_resp.json()
        assert len(enrolled) >= 1
        assert enrolled[0]["name"] == "Algorithms & Logic"
        assert enrolled[0]["is_current"] is True


def test_integrations_status_and_tests():
    with TestClient(app) as client:
        status_resp = client.get("/api/v1/integrations/status")
        assert status_resp.status_code == 200
        integrations = status_resp.json()
        assert len(integrations) >= 2
        names = [i["name"] for i in integrations]
        assert "moodle" in names
        assert "sap" in names

        # Test Moodle connector
        moodle_test = client.post("/api/v1/integrations/moodle/test")
        assert moodle_test.status_code == 200
        moodle_data = moodle_test.json()
        assert moodle_data["mode"] in ("live", "mock")
        assert "Moodle" in moodle_data["system"]

        # Test SAP connector
        sap_test = client.post("/api/v1/integrations/sap/test")
        assert sap_test.status_code == 200
        sap_data = sap_test.json()
        assert sap_data["mode"] in ("live", "mock")
        assert "SAP" in sap_data["system"]

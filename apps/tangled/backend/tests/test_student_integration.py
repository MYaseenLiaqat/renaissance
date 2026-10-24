import uuid
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from app.db import engine
from app.main import app
from app.models import Course, LearnerMap, Student


@pytest.fixture()
def setup_course(monkeypatch):
    """Sets up an instructor and an open course, mocking research_client.create_research_learner."""
    fake_learner_id = (uuid.uuid4().int % 1000000) + 1000
    fake_provisioning_token = f"fake-token-{fake_learner_id}"

    def mock_create_learner(prior_ability_score=None, idempotency_key=None):
        return {
            "id": fake_learner_id,
            "condition": "controlled_ai",
            "provisioning_token": fake_provisioning_token,
        }

    monkeypatch.setattr(
        "app.routers.student.create_research_learner",
        mock_create_learner,
    )

    with TestClient(app) as client:
        inst_email = f"instructor-{uuid.uuid4().hex[:8]}@example.com"
        inst_resp = client.post(
            "/api/v1/auth/register",
            json={"email": inst_email, "password": "password123"},
        )
        token = inst_resp.json()["access_token"]
        course_resp = client.post(
            "/api/v1/courses",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": "CS101 Python", "class_size": 30},
        )
        course = course_resp.json()
        yield client, course, fake_learner_id, fake_provisioning_token


def test_returning_student_login_and_mapping_persistence(setup_course):
    client, course, expected_learner_id, expected_token = setup_course
    email = f"alice-{uuid.uuid4().hex[:6]}@university.edu"
    password = "securePassword123"

    # 1. Register student
    reg_resp = client.post(
        "/api/v1/student/register",
        json={
            "email": email,
            "password": password,
            "code": course["join_code"],
            "consent": True,
        },
    )
    assert reg_resp.status_code == 200
    reg_data = reg_resp.json()
    assert "access_token" in reg_data
    assert reg_data["course_name"] == course["name"]

    # Verify LearnerMap created in DB
    with Session(engine) as s:
        student = s.exec(select(Student).where(Student.email == email)).first()
        assert student is not None
        mapping_before = s.exec(select(LearnerMap).where(LearnerMap.user_id == student.id)).first()
        assert mapping_before is not None
        assert mapping_before.research_learner_id == expected_learner_id
        assert mapping_before.research_learner_token == expected_token
        mapping_id_before = mapping_before.id

    # 2. Login with incorrect password -> 401
    bad_login = client.post(
        "/api/v1/student/login",
        json={"email": email, "password": "wrongPassword123"},
    )
    assert bad_login.status_code == 401
    assert "invalid email or password" in bad_login.json()["detail"].lower()

    # 3. Login with nonexistent email -> 401
    ghost_login = client.post(
        "/api/v1/student/login",
        json={"email": "nobody@university.edu", "password": password},
    )
    assert ghost_login.status_code == 401

    # 4. Login with correct credentials -> 200
    login_resp = client.post(
        "/api/v1/student/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    login_token = login_data["access_token"]
    assert login_data["course_name"] == course["name"]

    # 5. Verify LearnerMap remains unchanged (no duplicates, identical ID and token)
    with Session(engine) as s:
        mappings = s.exec(select(LearnerMap).where(LearnerMap.user_id == student.id)).all()
        assert len(mappings) == 1
        assert mappings[0].id == mapping_id_before
        assert mappings[0].research_learner_id == expected_learner_id
        assert mappings[0].research_learner_token == expected_token

        # Total student count remains 1
        students = s.exec(select(Student).where(Student.email == email)).all()
        assert len(students) == 1

    # 6. Verify returning-session access (/me and /materials)
    headers = {"Authorization": f"Bearer {login_token}"}
    me_resp = client.get("/api/v1/student/me", headers=headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == email
    assert me_data["course_name"] == course["name"]

    mat_resp = client.get("/api/v1/student/materials", headers=headers)
    assert mat_resp.status_code == 200


def test_research_ai_chat_proxy_authorized(setup_course, monkeypatch):
    client, course, expected_learner_id, expected_token = setup_course
    email = f"bob-{uuid.uuid4().hex[:6]}@university.edu"
    password = "securePassword123"

    # Register
    reg_resp = client.post(
        "/api/v1/student/register",
        json={"email": email, "password": password, "code": course["join_code"], "consent": True},
    )
    token = reg_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Mock research_request to intercept call and verify server-side propagation
    captured_requests = []

    def mock_research_request(method, path, mapping, payload=None):
        captured_requests.append({
            "method": method,
            "path": path,
            "learner_id": mapping.research_learner_id,
            "learner_token": mapping.research_learner_token,
            "payload": payload,
        })
        return {
            "sequence_num": 1,
            "response": "Consider initializing your loop variable before the loop.",
            "remaining_interactions": 7,
        }

    monkeypatch.setattr("app.routers.student.research_request", mock_research_request)

    chat_resp = client.post(
        "/api/v1/student/research/ai/chat",
        headers=headers,
        json={"attempt_id": 101, "message": "How do I count elements in my loop?"},
    )
    assert chat_resp.status_code == 200
    data = chat_resp.json()
    assert data["sequence_num"] == 1
    assert "initializing" in data["response"]
    assert data["remaining_interactions"] == 7

    # Verify server resolved the persistent mapping and forwarded the credentials
    assert len(captured_requests) == 1
    req = captured_requests[0]
    assert req["method"] == "POST"
    assert req["path"] == "/ai/chat"
    assert req["learner_id"] == expected_learner_id
    assert req["learner_token"] == expected_token
    assert req["payload"] == {"attempt_id": 101, "message": "How do I count elements in my loop?"}


def test_research_ai_chat_proxy_error_handling(setup_course, monkeypatch):
    client, course, _, _ = setup_course
    email = f"charlie-{uuid.uuid4().hex[:6]}@university.edu"
    password = "securePassword123"

    reg_resp = client.post(
        "/api/v1/student/register",
        json={"email": email, "password": password, "code": course["join_code"], "consent": True},
    )
    token = reg_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    from fastapi import HTTPException

    # Case 1: no_ai participant rejection (403)
    def mock_no_ai(*args, **kwargs):
        raise HTTPException(status_code=403, detail="AI assistance is not available")

    monkeypatch.setattr("app.routers.student.research_request", mock_no_ai)
    resp_no_ai = client.post(
        "/api/v1/student/research/ai/chat",
        headers=headers,
        json={"attempt_id": 102, "message": "Can I use AI?"},
    )
    assert resp_no_ai.status_code == 403
    assert resp_no_ai.json()["detail"] == "AI assistance is not available"

    # Case 2: AI interaction cap reached (429)
    def mock_cap_reached(*args, **kwargs):
        raise HTTPException(status_code=429, detail="AI interaction cap reached")

    monkeypatch.setattr("app.routers.student.research_request", mock_cap_reached)
    resp_cap = client.post(
        "/api/v1/student/research/ai/chat",
        headers=headers,
        json={"attempt_id": 102, "message": "One more question please"},
    )
    assert resp_cap.status_code == 429
    assert resp_cap.json()["detail"] == "AI interaction cap reached"

    # Case 3: AI provider not configured (503)
    def mock_ai_unconfigured(*args, **kwargs):
        raise HTTPException(status_code=503, detail="AI provider is not configured")

    monkeypatch.setattr("app.routers.student.research_request", mock_ai_unconfigured)
    resp_unconfigured = client.post(
        "/api/v1/student/research/ai/chat",
        headers=headers,
        json={"attempt_id": 102, "message": "Hello"},
    )
    assert resp_unconfigured.status_code == 503
    assert resp_unconfigured.json()["detail"] == "AI provider is not configured"


def test_research_task_submit_proxy(setup_course, monkeypatch):
    client, course, expected_learner_id, expected_token = setup_course
    email = f"dan-{uuid.uuid4().hex[:6]}@university.edu"
    password = "securePassword123"

    reg_resp = client.post(
        "/api/v1/student/register",
        json={"email": email, "password": password, "code": course["join_code"], "consent": True},
    )
    token = reg_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    captured_requests = []

    def mock_submit_request(method, path, mapping, payload=None):
        captured_requests.append({
            "method": method,
            "path": path,
            "learner_id": mapping.research_learner_id,
            "learner_token": mapping.research_learner_token,
            "payload": payload,
        })
        return {
            "score": 1.0,
            "all_passed": True,
            "completed": True,
            "feedback": "All tests passed!",
            "immediate_unlocked": True,
        }

    monkeypatch.setattr("app.routers.student.research_request", mock_submit_request)

    submit_resp = client.post(
        "/api/v1/student/research/tasks/42/submit",
        headers=headers,
        json={"code": "result = 3"},
    )
    assert submit_resp.status_code == 200
    res = submit_resp.json()
    assert res["score"] == 1.0
    assert res["all_passed"] is True
    assert res["completed"] is True

    assert len(captured_requests) == 1
    req = captured_requests[0]
    assert req["method"] == "POST"
    assert req["path"] == "/tasks/42/submit"
    assert req["learner_id"] == expected_learner_id
    assert req["learner_token"] == expected_token
    assert req["payload"] == {"code": "result = 3"}


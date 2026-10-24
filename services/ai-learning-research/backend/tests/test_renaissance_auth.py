from datetime import datetime
import pytest


def test_missing_service_token_rejected(service_client, make_learner):
    learner = make_learner()
    resp = service_client.get(
        f"/learners/{learner.id}",
        headers={"X-Renaissance-Service-Token": ""},
    )
    assert resp.status_code == 401
    assert "service authentication is required" in resp.json()["detail"].lower()


def test_invalid_service_token_rejected(service_client, make_learner):
    learner = make_learner()
    resp = service_client.get(
        f"/learners/{learner.id}",
        headers={"X-Renaissance-Service-Token": "completely-wrong-service-token"},
    )
    assert resp.status_code == 401
    assert "service authentication is required" in resp.json()["detail"].lower()


def test_missing_learner_token_rejected_with_401(
    service_client, make_learner, make_task, make_attempt
):
    learner = make_learner()
    task = make_task("supported")
    attempt = make_attempt(learner, task, started_at=datetime.utcnow())

    endpoints = [
        ("GET", f"/learners/{learner.id}", None),
        ("GET", f"/learners/{learner.id}/status", None),
        ("GET", f"/learning/loops?learner_id={learner.id}", None),
        ("POST", f"/learning/loops/start?learner_id={learner.id}", None),
        ("GET", f"/tasks/learner/{learner.id}", None),
        ("POST", f"/tasks/{task.id}/start?learner_id={learner.id}", None),
        (
            "POST",
            f"/tasks/{task.id}/submit?learner_id={learner.id}",
            {"code": "result = 0"},
        ),
        ("POST", "/ai/chat", {"attempt_id": attempt.id, "message": "help"}),
    ]

    for method, path, payload in endpoints:
        if method == "GET":
            resp = service_client.get(path)
        else:
            resp = service_client.post(path, json=payload or {})
        assert resp.status_code == 401, f"Expected 401 for {method} {path}, got {resp.status_code}"
        assert "learner authorization token is required" in resp.json()["detail"].lower()


def test_invalid_learner_token_rejected_with_403(
    service_client, make_learner, make_task, make_attempt
):
    learner = make_learner()
    task = make_task("supported")
    attempt = make_attempt(learner, task, started_at=datetime.utcnow())

    headers = {"X-Renaissance-Learner-Token": "wrong-token-value"}

    endpoints = [
        ("GET", f"/learners/{learner.id}", None),
        ("GET", f"/learners/{learner.id}/status", None),
        ("GET", f"/learning/loops?learner_id={learner.id}", None),
        ("POST", f"/learning/loops/start?learner_id={learner.id}", None),
        ("GET", f"/tasks/learner/{learner.id}", None),
        ("POST", f"/tasks/{task.id}/start?learner_id={learner.id}", None),
        (
            "POST",
            f"/tasks/{task.id}/submit?learner_id={learner.id}",
            {"code": "result = 0"},
        ),
        ("POST", "/ai/chat", {"attempt_id": attempt.id, "message": "help"}),
    ]

    for method, path, payload in endpoints:
        if method == "GET":
            resp = service_client.get(path, headers=headers)
        else:
            resp = service_client.post(path, headers=headers, json=payload or {})
        assert resp.status_code == 403, f"Expected 403 for {method} {path}, got {resp.status_code}"
        assert "learner authorization is required" in resp.json()["detail"].lower()


def test_correct_learner_token_accepted(service_client, make_learner):
    token = "secret-token-abc"
    learner = make_learner(learner_token=token)

    resp = service_client.get(
        f"/learners/{learner.id}",
        headers={"X-Renaissance-Learner-Token": token},
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == learner.id


def test_cross_learner_access_rejected_with_403(
    service_client, make_learner, make_task, make_attempt
):
    learner_a = make_learner(learner_token="token-learner-a")
    learner_b = make_learner(learner_token="token-learner-b")
    task = make_task("supported")
    attempt_b = make_attempt(learner_b, task, started_at=datetime.utcnow())

    headers_a = {"X-Renaissance-Learner-Token": "token-learner-a"}

    # Attempt to access learner B using learner A's token
    endpoints = [
        ("GET", f"/learners/{learner_b.id}", None),
        ("GET", f"/learners/{learner_b.id}/status", None),
        ("GET", f"/learning/loops?learner_id={learner_b.id}", None),
        ("POST", f"/learning/loops/start?learner_id={learner_b.id}", None),
        ("GET", f"/tasks/learner/{learner_b.id}", None),
        ("POST", f"/tasks/{task.id}/start?learner_id={learner_b.id}", None),
        (
            "POST",
            f"/tasks/{task.id}/submit?learner_id={learner_b.id}",
            {"code": "result = 0"},
        ),
        ("POST", "/ai/chat", {"attempt_id": attempt_b.id, "message": "help"}),
    ]

    for method, path, payload in endpoints:
        if method == "GET":
            resp = service_client.get(path, headers=headers_a)
        else:
            resp = service_client.post(path, headers=headers_a, json=payload or {})
        assert resp.status_code == 403, f"Expected 403 for {method} {path}, got {resp.status_code}"
        assert "learner authorization is required" in resp.json()["detail"].lower()


def test_learner_without_token_hash_rejected_with_403(
    service_client, make_learner
):
    # Learner with no token hash in database (e.g., corrupt or legacy record)
    learner = make_learner(learner_token=None)
    assert learner.learner_access_token_hash is None

    # Should be rejected whether or not a token is sent
    resp1 = service_client.get(
        f"/learners/{learner.id}",
        headers={"X-Renaissance-Learner-Token": "any-token"},
    )
    assert resp1.status_code == 403

    resp2 = service_client.get(f"/learners/{learner.id}")
    assert resp2.status_code in (401, 403)

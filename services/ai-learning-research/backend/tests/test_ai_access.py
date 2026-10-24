from datetime import datetime, timedelta
from unittest.mock import patch

from app.config import settings
from app.models import AIInteraction, Concept, Task


def _configure_llm(monkeypatch):
    monkeypatch.setattr(settings, "llm_base_url", "http://fake-llm")
    monkeypatch.setattr(settings, "llm_api_key", "fake-key")
    monkeypatch.setattr(settings, "llm_model", "fake-model")


def _mock_llm_response():
    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"choices": [{"message": {"content": "AI response"}}]}

    return patch("app.routers.ai.httpx.post", return_value=FakeResponse())


def test_ai_participant_can_use_ai_on_supported_attempt(
    client, db_session, make_learner, make_task, make_attempt, monkeypatch
):
    _configure_llm(monkeypatch)
    learner = make_learner(condition="controlled_ai")
    task = make_task("supported")
    attempt = make_attempt(learner, task, started_at=datetime.utcnow())

    with _mock_llm_response():
        resp = client.post(
            "/ai/chat",
            json={"attempt_id": attempt.id, "message": "help me"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["response"] == "AI response"
    assert data["sequence_num"] == 1
    assert data["remaining_interactions"] == settings.ai_interaction_cap - 1


def test_no_ai_participant_receives_403(
    client, db_session, make_learner, make_task, make_attempt, monkeypatch
):
    _configure_llm(monkeypatch)
    learner = make_learner(condition="no_ai")
    task = make_task("supported")
    attempt = make_attempt(learner, task)

    resp = client.post(
        "/ai/chat",
        json={"attempt_id": attempt.id, "message": "help me"},
    )

    assert resp.status_code == 403


def test_ai_rejected_during_immediate(
    client, db_session, make_learner, make_task, make_attempt, monkeypatch
):
    _configure_llm(monkeypatch)
    learner = make_learner(condition="controlled_ai")
    task = make_task("immediate")
    attempt = make_attempt(learner, task)

    resp = client.post(
        "/ai/chat",
        json={"attempt_id": attempt.id, "message": "help me"},
    )

    assert resp.status_code == 403


def test_ai_rejected_during_delayed(
    client, db_session, make_learner, make_task, make_attempt, monkeypatch
):
    _configure_llm(monkeypatch)
    learner = make_learner(condition="controlled_ai")
    task = make_task("delayed")
    attempt = make_attempt(learner, task)

    resp = client.post(
        "/ai/chat",
        json={"attempt_id": attempt.id, "message": "help me"},
    )

    assert resp.status_code == 403


def test_ai_rejected_during_transfer(
    client, db_session, make_learner, make_task, make_attempt, monkeypatch
):
    _configure_llm(monkeypatch)
    learner = make_learner(condition="controlled_ai")
    task = make_task("transfer")
    attempt = make_attempt(learner, task)

    resp = client.post(
        "/ai/chat",
        json={"attempt_id": attempt.id, "message": "help me"},
    )

    assert resp.status_code == 403


def test_ai_rejected_during_criterion(
    client, db_session, make_learner, make_task, make_attempt, monkeypatch
):
    _configure_llm(monkeypatch)
    learner = make_learner(condition="controlled_ai")
    task = make_task("criterion")
    attempt = make_attempt(learner, task)

    resp = client.post(
        "/ai/chat",
        json={"attempt_id": attempt.id, "message": "help me"},
    )

    assert resp.status_code == 403


def test_future_attempt_cannot_use_ai(
    client, db_session, make_learner, make_task, make_attempt, monkeypatch
):
    _configure_llm(monkeypatch)
    learner = make_learner(condition="controlled_ai")
    task = make_task("supported")
    attempt = make_attempt(
        learner, task, scheduled_for=datetime.utcnow() + timedelta(days=1)
    )

    resp = client.post(
        "/ai/chat",
        json={"attempt_id": attempt.id, "message": "help me"},
    )

    assert resp.status_code == 409


def test_completed_attempt_cannot_use_ai(
    client, db_session, make_learner, make_task, make_attempt, monkeypatch
):
    _configure_llm(monkeypatch)
    learner = make_learner(condition="controlled_ai")
    task = make_task("supported")
    attempt = make_attempt(
        learner, task, completed_at=datetime.utcnow()
    )

    resp = client.post(
        "/ai/chat",
        json={"attempt_id": attempt.id, "message": "help me"},
    )

    assert resp.status_code == 409


def test_ai_request_cap_is_enforced(
    client, db_session, make_learner, make_task, make_attempt, monkeypatch
):
    _configure_llm(monkeypatch)
    learner = make_learner(condition="controlled_ai")
    task = make_task("supported")
    attempt = make_attempt(learner, task, started_at=datetime.utcnow())

    for _ in range(settings.ai_interaction_cap):
        with _mock_llm_response():
            resp = client.post(
                "/ai/chat",
                json={"attempt_id": attempt.id, "message": "help me"},
            )
        assert resp.status_code == 200

    resp = client.post(
        "/ai/chat",
        json={"attempt_id": attempt.id, "message": "help me"},
    )
    assert resp.status_code == 429


def test_ai_interaction_is_logged(
    client, db_session, make_learner, make_task, make_attempt, monkeypatch
):
    _configure_llm(monkeypatch)
    learner = make_learner(condition="controlled_ai")
    task = make_task("supported")
    attempt = make_attempt(learner, task, started_at=datetime.utcnow())

    with _mock_llm_response():
        resp = client.post(
            "/ai/chat",
            json={"attempt_id": attempt.id, "message": "help me"},
        )
    assert resp.status_code == 200

    interactions = (
        db_session.query(AIInteraction)
        .filter_by(attempt_id=attempt.id)
        .all()
    )
    assert len(interactions) == 1
    assert interactions[0].prompt == "help me"
    assert interactions[0].response == "AI response"
    assert interactions[0].sequence_num == 1


def test_ai_missing_configuration_produces_503(
    client, db_session, make_learner, make_task, make_attempt, monkeypatch
):
    monkeypatch.setattr(settings, "llm_api_key", None)
    learner = make_learner(condition="controlled_ai")
    task = make_task("supported")
    attempt = make_attempt(learner, task, started_at=datetime.utcnow())

    resp = client.post(
        "/ai/chat",
        json={"attempt_id": attempt.id, "message": "help me"},
    )
    assert resp.status_code == 503
    assert resp.json()["detail"] == "AI provider is not configured"


def test_ai_default_groq_base_url_used_when_unspecified(monkeypatch):
    from app.routers.ai import AI_PROVIDER_REGISTRY
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", "test-key")
    config = AI_PROVIDER_REGISTRY["groq"]()
    assert config["base_url"] == "https://api.groq.com/openai/v1"
    assert config["api_key"] == "test-key"


def test_ai_unsupported_provider_produces_503(
    client, db_session, make_learner, make_task, make_attempt, monkeypatch
):
    _configure_llm(monkeypatch)
    learner = make_learner(condition="controlled_ai")
    learner.ai_provider = "unsupported_provider_xyz"
    db_session.commit()

    task = make_task("supported")
    attempt = make_attempt(learner, task, started_at=datetime.utcnow())

    resp = client.post(
        "/ai/chat",
        json={"attempt_id": attempt.id, "message": "help me"},
    )
    assert resp.status_code == 503
    assert "Frozen AI provider is not configured" in resp.json()["detail"]


def test_ai_provider_error_produces_502_safely(
    client, db_session, make_learner, make_task, make_attempt, monkeypatch
):
    import httpx
    _configure_llm(monkeypatch)
    learner = make_learner(condition="controlled_ai")
    task = make_task("supported")
    attempt = make_attempt(learner, task, started_at=datetime.utcnow())

    def mock_post_error(*args, **kwargs):
        raise httpx.ConnectError("Connection refused to AI provider")

    monkeypatch.setattr("app.routers.ai.httpx.post", mock_post_error)

    resp = client.post(
        "/ai/chat",
        json={"attempt_id": attempt.id, "message": "help me"},
    )
    assert resp.status_code == 502
    assert "communication failure" in resp.json()["detail"]


def test_ai_default_gemini_base_url_used_when_unspecified(monkeypatch):
    from app.routers.ai import AI_PROVIDER_REGISTRY
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", "test-gemini-key")
    config = AI_PROVIDER_REGISTRY["gemini"]()
    assert config["base_url"] == "https://generativelanguage.googleapis.com/v1beta/openai"
    assert config["api_key"] == "test-gemini-key"


def test_ai_gemini_base_url_normalized_when_subpath_omitted(monkeypatch):
    from app.routers.ai import AI_PROVIDER_REGISTRY
    monkeypatch.setattr(settings, "llm_base_url", "https://generativelanguage.googleapis.com/v1beta")
    monkeypatch.setattr(settings, "llm_api_key", "test-gemini-key")
    config = AI_PROVIDER_REGISTRY["gemini"]()
    assert config["base_url"] == "https://generativelanguage.googleapis.com/v1beta/openai"


def test_gemini_learner_ai_chat_flow(
    client, db_session, make_learner, make_task, make_attempt, monkeypatch
):
    monkeypatch.setattr(settings, "llm_base_url", "https://generativelanguage.googleapis.com/v1beta")
    monkeypatch.setattr(settings, "llm_api_key", "gemini-key")
    monkeypatch.setattr(settings, "llm_model", "gemini-3.5-flash-lite")
    learner = make_learner(condition="controlled_ai")
    learner.ai_provider = "gemini"
    learner.ai_model = "gemini-3.5-flash-lite"
    db_session.commit()

    task = make_task("supported")
    attempt = make_attempt(learner, task, started_at=datetime.utcnow())

    with _mock_llm_response():
        resp = client.post(
            "/ai/chat",
            json={"attempt_id": attempt.id, "message": "how do loops work?"},
        )
    assert resp.status_code == 200
    assert resp.json()["response"] == "AI response"


def test_ai_provider_quota_exceeded_safe_message(
    client, db_session, make_learner, make_task, make_attempt, monkeypatch
):
    import httpx
    _configure_llm(monkeypatch)
    learner = make_learner(condition="controlled_ai")
    task = make_task("supported")
    attempt = make_attempt(learner, task, started_at=datetime.utcnow())

    def mock_quota_429(*args, **kwargs):
        req = httpx.Request("POST", "https://api.fake/chat/completions")
        resp = httpx.Response(429, request=req, text="Rate limit exceeded")
        raise httpx.HTTPStatusError("Quota exceeded", request=req, response=resp)

    monkeypatch.setattr("app.routers.ai.httpx.post", mock_quota_429)

    resp = client.post(
        "/ai/chat",
        json={"attempt_id": attempt.id, "message": "help"},
    )
    assert resp.status_code == 502
    assert "rate limit or quota exceeded" in resp.json()["detail"].lower()


def test_ai_provider_timeout_safe_message(
    client, db_session, make_learner, make_task, make_attempt, monkeypatch
):
    import httpx
    _configure_llm(monkeypatch)
    learner = make_learner(condition="controlled_ai")
    task = make_task("supported")
    attempt = make_attempt(learner, task, started_at=datetime.utcnow())

    def mock_timeout(*args, **kwargs):
        raise httpx.ReadTimeout("Timed out waiting for upstream LLM")

    monkeypatch.setattr("app.routers.ai.httpx.post", mock_timeout)

    resp = client.post(
        "/ai/chat",
        json={"attempt_id": attempt.id, "message": "help"},
    )
    assert resp.status_code == 502
    assert "timed out" in resp.json()["detail"].lower()


import uuid
import httpx
from fastapi import HTTPException
from .config import settings


def create_research_learner(
    prior_ability_score: float | None = None,
    idempotency_key: str | None = None,
) -> dict:
    """Create a research learner through the research service."""
    payload = {"prior_ability_score": prior_ability_score}
    token = settings.research_service_token.get_secret_value()

    if not token:
        raise HTTPException(
            status_code=503,
            detail="Research service authentication is not configured.",
        )

    try:
        response = httpx.post(
            f"{settings.research_service_url.rstrip('/')}/learners",
            json=payload,
            headers={
                "X-Renaissance-Service-Token": token,
                "Idempotency-Key": idempotency_key or str(uuid.uuid4()),
            },
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError:
        raise HTTPException(
            status_code=502,
            detail="Research service request failed.",
        )


def research_request(method: str, path: str, mapping, payload: dict | None = None) -> dict | list:
    token = settings.research_service_token.get_secret_value()
    if not token:
        raise HTTPException(503, "Research service authentication is not configured.")
    headers = {"X-Renaissance-Service-Token": token}
    if mapping.research_learner_token:
        headers["X-Renaissance-Learner-Token"] = mapping.research_learner_token
    try:
        response = httpx.request(
            method,
            f"{settings.research_service_url.rstrip('/')}{path}",
            params={"learner_id": mapping.research_learner_id},
            json=payload,
            headers=headers,
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(exc.response.status_code, "Research service rejected the request.")
    except httpx.HTTPError:
        raise HTTPException(502, "Research service request failed.")

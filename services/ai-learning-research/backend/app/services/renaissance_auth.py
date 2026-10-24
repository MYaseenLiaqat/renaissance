import secrets
import hashlib

from fastapi import Header, HTTPException

from app.config import settings


def require_renaissance_service(
    x_renaissance_service_token: str | None = Header(default=None),
) -> None:
    expected_token = settings.renaissance_service_token

    if not expected_token or not x_renaissance_service_token:
        raise HTTPException(
            status_code=401,
            detail="Valid Renaissance service authentication is required.",
        )
    if not secrets.compare_digest(x_renaissance_service_token, expected_token):
        raise HTTPException(
            status_code=401,
            detail="Valid Renaissance service authentication is required.",
        )


def require_learner_access(learner, learner_token: str | None) -> None:
    if not learner_token:
        raise HTTPException(
            status_code=401,
            detail="Learner authorization token is required.",
        )
    if not learner.learner_access_token_hash:
        raise HTTPException(
            status_code=403,
            detail="Learner authorization is required.",
        )
    token_hash = hashlib.sha256(learner_token.encode("utf-8")).hexdigest()
    if not secrets.compare_digest(token_hash, learner.learner_access_token_hash):
        raise HTTPException(
            status_code=403,
            detail="Learner authorization is required.",
        )

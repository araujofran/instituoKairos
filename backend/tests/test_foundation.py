import time
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings
from app.core.security import Actor, course_administrator, validate_token
from app.main import app
from app.modules.academic.domain import Role, can_manage_cohort
from app.modules.academic.schemas import CourseInput


def test_liveness_and_no_sensitive_configuration() -> None:
    with TestClient(app) as client:
        response = client.get("/health/live")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        assert response.headers["x-request-id"]
        assert response.headers["cache-control"] == "no-store"


def test_anonymous_cannot_mutate_courses() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/admin/courses",
            json={
                "title": "Bibliologia",
                "slug": "bibliologia",
            },
        )
        assert response.status_code == 401


@pytest.mark.parametrize("role", [Role.TEACHER, Role.STUDENT])
def test_only_admin_can_manage_course(role: Role) -> None:
    with pytest.raises(HTTPException) as exc:
        course_administrator(Actor(uuid4(), "Pessoa", frozenset({role})))
    assert exc.value.status_code == 403


def test_teacher_is_scoped_to_assigned_cohort() -> None:
    assert can_manage_cohort({Role.TEACHER}, assigned=True)
    assert not can_manage_cohort({Role.TEACHER}, assigned=False)
    assert not can_manage_cohort({Role.STUDENT}, assigned=True)


def test_production_fails_without_identity_provider_and_database() -> None:
    with pytest.raises(ValidationError):
        Settings(environment="production", _env_file=None)


def test_course_rejects_invalid_slug_and_empty_title() -> None:
    with pytest.raises(ValidationError):
        CourseInput(title="   ", slug="Invalid/Slug")


@pytest.mark.parametrize("failure", ["expired", "issuer", "audience", "tampered", "missing_exp"])
def test_jwt_rejects_invalid_claims_and_signature(failure: str) -> None:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    settings = Settings(
        auth_issuer="https://identity.example/auth/v1",
        auth_jwks_url="https://identity.example/keys",
        _env_file=None,
    )
    claims: dict[str, object] = {
        "iss": settings.auth_issuer,
        "aud": "authenticated",
        "sub": "test-user",
        "iat": int(time.time()) - 100,
        "exp": int(time.time()) + 300,
    }
    if failure == "expired":
        claims["exp"] = int(time.time()) - 1
    elif failure == "issuer":
        claims["iss"] = "https://attacker.example"
    elif failure == "audience":
        claims["aud"] = "other-service"
    elif failure == "missing_exp":
        del claims["exp"]
    signing_key = (
        rsa.generate_private_key(public_exponent=65537, key_size=2048)
        if failure == "tampered"
        else key
    )
    token = jwt.encode(claims, signing_key, algorithm="RS256")
    with patch("app.core.security.jwks_client") as client:
        client.return_value.get_signing_key_from_jwt.return_value = SimpleNamespace(
            key=key.public_key(),
        )
        with pytest.raises(HTTPException) as exc:
            validate_token(token, settings)
        assert exc.value.status_code == 401


def test_valid_signed_token_does_not_grant_claimed_admin_role() -> None:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    settings = Settings(
        auth_issuer="https://identity.example/auth/v1",
        auth_jwks_url="https://identity.example/keys",
        _env_file=None,
    )
    token = jwt.encode(
        {
            "iss": settings.auth_issuer,
            "aud": "authenticated",
            "sub": "test-user",
            "iat": int(time.time()),
            "exp": int(time.time()) + 300,
            "role": "admin",
        },
        key,
        algorithm="RS256",
    )
    with patch("app.core.security.jwks_client") as client:
        client.return_value.get_signing_key_from_jwt.return_value = SimpleNamespace(
            key=key.public_key(),
        )
        result = validate_token(token, settings)
        assert result.subject == "test-user"
        assert not hasattr(result, "roles")

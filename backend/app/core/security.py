from dataclasses import dataclass
from datetime import UTC, datetime
from functools import lru_cache
from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_engine, get_session
from app.core.passwords import token_digest
from app.modules.academic.domain import Role, can_manage_course
from app.modules.academic.models import Identity, UserRole
from app.modules.identity.models import LocalSession

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Actor:
    id: UUID
    display_name: str
    roles: frozenset[Role]
    avatar_url: str | None = None


@dataclass(frozen=True)
class TokenIdentity:
    issuer: str
    subject: str


@lru_cache(maxsize=4)
def jwks_client(url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(url, cache_jwk_set=True, lifespan=300, timeout=5)


def validate_token(token: str, settings: Settings) -> TokenIdentity:
    if not settings.auth_issuer or not settings.auth_jwks_url:
        raise HTTPException(status_code=503, detail="Autenticação ainda não configurada.")
    try:
        key = jwks_client(settings.auth_jwks_url).get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256", "ES256"],
            audience=settings.auth_audience,
            issuer=settings.auth_issuer,
            options={"require": ["exp", "iat", "sub", "iss", "aud"]},
        )
        return TokenIdentity(issuer=settings.auth_issuer, subject=str(claims["sub"]))
    except jwt.PyJWKClientConnectionError as exc:
        raise HTTPException(
            status_code=503, detail="Provedor de autenticação indisponível."
        ) from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=401,
            detail="Sessão inválida ou expirada.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def authenticated_identity(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenIdentity:
    raw = request.cookies.get("kairos_session")
    if raw:
        if not settings.local_auth_enabled:
            raise HTTPException(401, "Sessão local desabilitada.")
        with Session(get_engine()) as local_session:
            result = local_session.execute(
                select(LocalSession, Identity)
                .join(
                    Identity,
                    LocalSession.user_id == Identity.id,
                )
                .where(
                    LocalSession.token_hash == token_digest(raw),
                    LocalSession.revoked.is_(False),
                    LocalSession.expires_at > datetime.now(UTC),
                )
            ).first()
            if result is None:
                raise HTTPException(401, "Sessão expirada. Entre novamente.")
            _, user = result
            return TokenIdentity(user.auth_issuer, user.auth_subject)
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Entre para continuar.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return validate_token(credentials.credentials, settings)


def current_actor(
    identity: Annotated[TokenIdentity, Depends(authenticated_identity)],
    session: Annotated[Session, Depends(get_session)],
) -> Actor:
    user = session.scalar(
        select(Identity).where(
            Identity.auth_issuer == identity.issuer,
            Identity.auth_subject == identity.subject,
        )
    )
    if (
        user is None
        or not user.active
        or user.account_status != "active"
        or user.must_change_credentials
    ):
        raise HTTPException(status_code=403, detail="Conta acadêmica não habilitada.")
    roles = session.scalars(select(UserRole.role).where(UserRole.user_id == user.id))
    return Actor(
        user.id, user.display_name, frozenset(Role(role) for role in roles), user.avatar_url
    )


def course_administrator(actor: Annotated[Actor, Depends(current_actor)]) -> Actor:
    if not can_manage_course(set(actor.roles)):
        raise HTTPException(status_code=403, detail="Operação permitida ao administrador.")
    return actor

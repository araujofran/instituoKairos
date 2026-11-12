import re
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import func, select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_session
from app.core.passwords import hash_password, token_digest, verify_password
from app.core.security import TokenIdentity, authenticated_identity
from app.modules.academic.models import AuditLog, Identity, UserRole
from app.modules.identity.models import LocalSession, LoginAttempt, PasswordResetRequest

COOKIE = "kairos_session"
router = APIRouter(prefix="/api/v1/auth", tags=["Autenticação local"])
Database = Annotated[Session, Depends(get_session)]


class EmailInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(max_length=254)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        value = value.strip().casefold()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Informe um e-mail válido.")
        return value


class LoginInput(EmailInput):
    password: str = Field(min_length=1, max_length=256)
    remember: bool = False


class CredentialsInput(EmailInput):
    password: str = Field(min_length=12, max_length=256)


class RegistrationInput(CredentialsInput):
    name: str = Field(min_length=3, max_length=150)


class AuthProfile(BaseModel):
    id: UUID
    display_name: str
    email: str | None
    avatar_url: str | None
    roles: list[str]
    account_status: str
    must_change_credentials: bool
    pending_email: str | None


def profile(session: Session, user: Identity) -> AuthProfile:
    return AuthProfile(
        id=user.id,
        display_name=user.display_name,
        email=user.email,
        avatar_url=user.avatar_url,
        roles=list(session.scalars(select(UserRole.role).where(UserRole.user_id == user.id))),
        account_status=user.account_status,
        must_change_credentials=user.must_change_credentials,
        pending_email=user.pending_email,
    )


def session_user(
    identity: Annotated[TokenIdentity, Depends(authenticated_identity)],
    session: Database,
) -> Identity:
    user = session.scalar(
        select(Identity).where(
            Identity.auth_issuer == identity.issuer,
            Identity.auth_subject == identity.subject,
        )
    )
    if not user or not user.active or user.account_status in {"cancelled", "suspended"}:
        raise HTTPException(403, "Conta desabilitada. Entre em contato com a administração.")
    return user


LimitedUser = Annotated[Identity, Depends(session_user)]


def revoke_sessions(session: Session, user_id: UUID) -> None:
    session.execute(
        update(LocalSession).where(LocalSession.user_id == user_id).values(revoked=True)
    )


def rate_limit(session: Session, email: str, ip: str) -> tuple[str, str]:
    keys = (token_digest(f"email:{email}"), token_digest(f"ip:{ip}"))
    for key in sorted(keys):
        session.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": int(key[:15], 16)})
    since = datetime.now(UTC) - timedelta(minutes=15)
    for key, limit in zip(keys, (5, 30), strict=True):
        attempts = (
            session.scalar(
                select(func.count())
                .select_from(LoginAttempt)
                .where(
                    LoginAttempt.key_hash == key,
                    LoginAttempt.created_at >= since,
                )
            )
            or 0
        )
        if attempts >= limit:
            raise HTTPException(429, "Muitas tentativas. Aguarde 15 minutos e tente novamente.")
    session.add_all(LoginAttempt(key_hash=key) for key in keys)
    session.flush()
    return keys


@router.post("/login", response_model=AuthProfile)
def login(data: LoginInput, request: Request, response: Response, session: Database) -> AuthProfile:
    if not get_settings().local_auth_enabled:
        raise HTTPException(503, "Login local não habilitado.")
    rate_limit(session, data.email, request.client.host if request.client else "unknown")
    user = session.scalar(select(Identity).where(Identity.email == data.email))
    valid = verify_password(data.password, user.password_hash if user else None)
    if not valid or user is None:
        session.commit()
        raise HTTPException(401, "E-mail ou senha incorretos.")
    if not user.active or user.account_status in {"cancelled", "suspended"}:
        raise HTTPException(403, "Acesso cancelado ou suspenso pela administração.")
    if user.password_hash and not user.password_hash.startswith("scrypt$131072$"):
        user.password_hash = hash_password(data.password)
    raw_token = secrets.token_urlsafe(48)
    max_age = 60 * 60 * (24 * 7 if data.remember else 12)
    session.add(
        LocalSession(
            user_id=user.id,
            token_hash=token_digest(raw_token),
            expires_at=datetime.now(UTC) + timedelta(seconds=max_age),
        )
    )
    session.add(AuditLog(actor_id=user.id, action="auth.login", resource_id=user.id))
    session.commit()
    response.set_cookie(
        COOKIE,
        raw_token,
        httponly=True,
        secure=get_settings().environment == "production",
        samesite="strict",
        path="/",
        max_age=max_age if data.remember else None,
    )
    return profile(session, user)


@router.get("/me", response_model=AuthProfile)
def auth_me(user: LimitedUser, session: Database) -> AuthProfile:
    return profile(session, user)


@router.post("/logout")
def logout(request: Request, response: Response, session: Database) -> dict[str, str]:
    raw = request.cookies.get(COOKIE)
    if raw:
        session.execute(
            update(LocalSession)
            .where(
                LocalSession.token_hash == token_digest(raw),
            )
            .values(revoked=True)
        )
        session.commit()
    response.delete_cookie(COOKIE, path="/", httponly=True, samesite="strict")
    return {"message": "Sessão encerrada."}


@router.post("/onboarding", response_model=AuthProfile)
def onboarding(data: CredentialsInput, user: LimitedUser, session: Database) -> AuthProfile:
    if not user.must_change_credentials:
        raise HTTPException(409, "Sua conta não requer atualização de credenciais.")
    domain = data.email.rsplit("@", 1)[-1]
    if domain in {"teste.com", "test.com", "example.com"} or domain.endswith(".test"):
        raise HTTPException(422, "Informe seu e-mail real, diferente do endereço provisório.")
    if verify_password(data.password, user.password_hash):
        raise HTTPException(422, "Escolha uma nova senha, diferente da provisória.")
    if session.scalar(
        select(Identity.id).where(Identity.email == data.email, Identity.id != user.id)
    ):
        raise HTTPException(409, "E-mail indisponível.")
    user.pending_email = data.email
    user.pending_password_hash = hash_password(data.password)
    user.account_status = "pending"
    session.add(
        AuditLog(actor_id=user.id, action="user.credentials_submitted", resource_id=user.id)
    )
    session.commit()
    return profile(session, user)


@router.post("/register", status_code=201)
def register(data: RegistrationInput, request: Request, session: Database) -> dict[str, str]:
    rate_limit(session, data.email, request.client.host if request.client else "unknown")
    password_hash = hash_password(data.password)
    try:
        if session.scalar(select(Identity.id).where(Identity.email == data.email)) is None:
            user_id = uuid4()
            user = Identity(
                id=user_id,
                auth_issuer="kairos-local",
                auth_subject=str(user_id),
                email=data.email,
                display_name=data.name.strip(),
                password_hash=password_hash,
                account_status="pending",
            )
            session.add(user)
            session.flush()
            session.add(UserRole(user_id=user.id, role="student"))
        session.commit()
    except IntegrityError:
        session.rollback()
    return {
        "message": (
            "Solicitação recebida. Se o e-mail estiver disponível, "
            "o cadastro aguardará aprovação da administração."
        )
    }


@router.post("/request-reset")
def request_reset(data: EmailInput, request: Request, session: Database) -> dict[str, str]:
    rate_limit(session, data.email, request.client.host if request.client else "unknown")
    user = session.scalar(select(Identity).where(Identity.email == data.email))
    if user and not session.scalar(
        select(PasswordResetRequest.id).where(
            PasswordResetRequest.user_id == user.id,
            PasswordResetRequest.status == "open",
        )
    ):
        session.add(PasswordResetRequest(user_id=user.id))
    session.commit()
    return {
        "message": (
            "Se houver uma conta com esse e-mail, a solicitação ficará disponível "
            "para a administração. Nenhum e-mail automático foi enviado."
        )
    }

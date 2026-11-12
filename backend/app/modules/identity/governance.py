import secrets
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError

from app.core.passwords import hash_password
from app.core.security import Actor, current_actor
from app.modules.academic.domain import Role
from app.modules.academic.models import AuditLog, Identity, UserRole
from app.modules.identity.local_auth import (
    AuthProfile,
    Database,
    EmailInput,
    profile,
    revoke_sessions,
)
from app.modules.identity.models import PasswordResetRequest

router = APIRouter(prefix="/api/v1/governance", tags=["Governança de usuários"])


def administrator(actor: Annotated[Actor, Depends(current_actor)]) -> Actor:
    if Role.ADMIN not in actor.roles:
        raise HTTPException(403, "Somente o administrador gerencia usuários.")
    return actor


Admin = Annotated[Actor, Depends(administrator)]


class UserInput(EmailInput):
    name: str = Field(min_length=3, max_length=150)
    role: Role
    account_status: Literal["active", "pending", "suspended", "cancelled"] = "pending"


class ManagedUser(AuthProfile):
    reset_requested: bool


@router.get("/users", response_model=list[ManagedUser])
def list_users(
    actor: Admin, session: Database, limit: Annotated[int, Query(ge=1, le=100)] = 100
) -> list[ManagedUser]:
    users = session.scalars(
        select(Identity).order_by(Identity.created_at, Identity.id).limit(limit)
    )
    requests = set(
        session.scalars(
            select(PasswordResetRequest.user_id).where(PasswordResetRequest.status == "open")
        )
    )
    return [
        ManagedUser(**profile(session, user).model_dump(), reset_requested=user.id in requests)
        for user in users
    ]


def get_target(session: Database, user_id: UUID) -> Identity:
    target = session.get(Identity, user_id)
    if target is None:
        raise HTTPException(404, "Usuário não encontrado.")
    return target


def preserve_admin(
    session: Database, actor: Actor, target: Identity, next_role: Role | None, disabling: bool
) -> None:
    roles = set(session.scalars(select(UserRole.role).where(UserRole.user_id == target.id)))
    if target.id == actor.id and (disabling or (next_role and next_role != Role.ADMIN)):
        raise HTTPException(409, "Você não pode remover seu próprio acesso administrativo.")
    if "admin" in roles and (disabling or (next_role and next_role != Role.ADMIN)):
        session.execute(
            select(Identity.id).join(UserRole).where(UserRole.role == "admin").with_for_update()
        )
        count = (
            session.scalar(
                select(func.count())
                .select_from(Identity)
                .join(UserRole)
                .where(
                    UserRole.role == "admin",
                    Identity.active.is_(True),
                    Identity.account_status == "active",
                )
            )
            or 0
        )
        if count <= 1:
            raise HTTPException(409, "A escola precisa manter ao menos um administrador ativo.")


def save_changes(session: Database) -> None:
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(409, "O e-mail informado já está em uso.") from exc


@router.post("/users", status_code=201)
def create_user(data: UserInput, actor: Admin, session: Database) -> dict[str, object]:
    temp = secrets.token_urlsafe(15)
    user_id = uuid4()
    user = Identity(
        id=user_id,
        auth_issuer="kairos-local",
        auth_subject=str(user_id),
        email=data.email,
        display_name=data.name.strip(),
        password_hash=hash_password(temp),
        account_status=data.account_status,
        active=data.account_status not in {"cancelled", "suspended"},
        must_change_credentials=True,
    )
    session.add(user)
    try:
        session.flush()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(409, "E-mail indisponível.") from exc
    session.add(UserRole(user_id=user.id, role=data.role.value))
    session.add(AuditLog(actor_id=actor.id, action="user.created", resource_id=user.id))
    save_changes(session)
    return {"user": profile(session, user), "temporary_password": temp}


@router.put("/users/{user_id}", response_model=AuthProfile)
def edit_user(user_id: UUID, data: UserInput, actor: Admin, session: Database) -> AuthProfile:
    target = get_target(session, user_id)
    preserve_admin(session, actor, target, data.role, data.account_status != "active")
    target.display_name = data.name.strip()
    target.email = data.email
    target.account_status = data.account_status
    target.active = data.account_status not in {"cancelled", "suspended"}
    session.execute(delete(UserRole).where(UserRole.user_id == target.id))
    session.add(UserRole(user_id=target.id, role=data.role.value))
    revoke_sessions(session, target.id)
    session.add(AuditLog(actor_id=actor.id, action="user.updated", resource_id=target.id))
    save_changes(session)
    return profile(session, target)


@router.post("/users/{user_id}/approve", response_model=AuthProfile)
def approve_user(user_id: UUID, actor: Admin, session: Database) -> AuthProfile:
    target = get_target(session, user_id)
    if target.must_change_credentials:
        if not target.pending_email or not target.pending_password_hash:
            raise HTTPException(409, "O usuário deve enviar primeiro o e-mail real e a nova senha.")
        target.email = target.pending_email
        target.password_hash = target.pending_password_hash
        target.pending_email = None
        target.pending_password_hash = None
        target.must_change_credentials = False
    target.account_status = "active"
    target.active = True
    revoke_sessions(session, target.id)
    session.add(AuditLog(actor_id=actor.id, action="user.approved", resource_id=target.id))
    save_changes(session)
    return profile(session, target)


@router.post("/users/{user_id}/cancel")
def cancel_user(user_id: UUID, actor: Admin, session: Database) -> dict[str, str]:
    target = get_target(session, user_id)
    preserve_admin(session, actor, target, None, True)
    target.active = False
    target.account_status = "cancelled"
    revoke_sessions(session, target.id)
    session.add(AuditLog(actor_id=actor.id, action="user.cancelled", resource_id=target.id))
    session.commit()
    return {"message": "Acesso cancelado e sessões revogadas."}


@router.post("/users/{user_id}/reset-password")
def reset_password(user_id: UUID, actor: Admin, session: Database) -> dict[str, str]:
    target = get_target(session, user_id)
    if target.id == actor.id:
        raise HTTPException(409, "Use outro administrador para redefinir seu acesso.")
    temp = secrets.token_urlsafe(15)
    target.password_hash = hash_password(temp)
    target.must_change_credentials = True
    target.pending_email = None
    target.pending_password_hash = None
    revoke_sessions(session, target.id)
    session.execute(
        update(PasswordResetRequest)
        .where(
            PasswordResetRequest.user_id == target.id,
        )
        .values(status="resolved")
    )
    session.add(AuditLog(actor_id=actor.id, action="user.password_reset", resource_id=target.id))
    session.commit()
    return {
        "temporary_password": temp,
        "message": (
            "Senha provisória gerada. Exibida somente nesta resposta. "
            "Compartilhe por um canal privado."
        ),
    }

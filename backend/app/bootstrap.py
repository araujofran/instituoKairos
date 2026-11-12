"""One-time local provisioning. Credentials are read without terminal echo, never from source."""

import getpass
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_engine
from app.core.passwords import hash_password
from app.modules.academic.models import AuditLog, Identity, UserRole


def main() -> None:
    with Session(get_engine()) as session:
        for role, name, avatar in (
            ("admin", "Prof. Francisco", "/images/francisco-professor.png"),
            ("coordinator", "Dorival", "/images/dorival-coordenador.png"),
        ):
            email = input(f"{role} email: ").strip().casefold()
            password = getpass.getpass(f"{role} password (hidden): ")
            if not email or not password:
                raise ValueError("E-mail e senha são obrigatórios.")
            existing = session.scalar(select(Identity).where(Identity.email == email))
            if existing:
                print(f"{role}: existing account preserved")
                continue
            user_id = uuid4()
            user = Identity(
                id=user_id,
                auth_issuer="kairos-local",
                auth_subject=str(user_id),
                email=email,
                display_name=name,
                avatar_url=avatar,
                password_hash=hash_password(password),
                account_status="active",
                must_change_credentials=role == "coordinator",
            )
            session.add(user)
            session.flush()
            session.add(UserRole(user_id=user.id, role=role))
            session.add(
                AuditLog(actor_id=user.id, action="user.initial_provisioned", resource_id=user.id)
            )
        session.commit()
    print("Provisioning completed; credentials were not printed or saved in source files.")


if __name__ == "__main__":
    main()

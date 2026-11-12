"""Explicit administrative commands. No public endpoint can assign roles."""

import argparse

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_engine
from app.modules.academic.models import AuditLog, Course, Identity, Module, Unit, UserRole

CURRICULUM = [
    "Introdução à Bibliologia",
    "Revelação geral e especial",
    "Inspiração das Escrituras",
    "Autoridade e inerrância bíblica",
    "Formação do cânon do Antigo Testamento",
    "Formação do cânon do Novo Testamento",
    "Manuscritos bíblicos",
    "Introdução à crítica textual",
    "Traduções e versões da Bíblia",
    "Interpretação bíblica e contexto histórico-cultural",
]


def provision_user(
    session: Session,
    issuer: str,
    subject: str,
    name: str,
    role: str,
) -> Identity:
    user = session.scalar(
        select(Identity).where(
            Identity.auth_issuer == issuer,
            Identity.auth_subject == subject,
        )
    )
    if user is None:
        user = Identity(auth_issuer=issuer, auth_subject=subject, display_name=name)
        session.add(user)
        session.flush()
    if not session.get(UserRole, (user.id, role)):
        session.add(UserRole(user_id=user.id, role=role))
        session.add(AuditLog(actor_id=user.id, action="user.role_provisioned", resource_id=user.id))
    session.commit()
    return user


def seed_curriculum(session: Session) -> None:
    existing = session.scalar(select(Course).where(Course.slug == "bibliologia-critica-textual"))
    if existing:
        return  # Never overwrite editorial changes in a repeated seed.
    course = Course(
        title="Bibliologia e Crítica Textual",
        slug="bibliologia-critica-textual",
        description="Estudo da origem, transmissão e interpretação das Escrituras.",
        status="draft",
    )
    session.add(course)
    session.flush()
    module = Module(
        course_id=course.id, title="Módulo I — Bibliologia e Crítica Textual", position=1
    )
    session.add(module)
    session.flush()
    session.add_all(
        Unit(module_id=module.id, title=t, position=i) for i, t in enumerate(CURRICULUM, 1)
    )
    session.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Administração explícita da escola")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("seed-curriculum")
    user = sub.add_parser("provision-user")
    user.add_argument("--issuer", required=True)
    user.add_argument("--subject", required=True)
    user.add_argument("--name", required=True)
    user.add_argument("--role", choices=["admin", "teacher", "student"], required=True)
    args = parser.parse_args()
    with Session(get_engine()) as session:
        if args.command == "seed-curriculum":
            seed_curriculum(session)
        else:
            provision_user(session, args.issuer, args.subject, args.name, args.role)
    print("Operação concluída.")


if __name__ == "__main__":
    main()

import os
import subprocess
import sys
from collections.abc import Generator
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.cli import provision_user, seed_curriculum
from app.core.database import get_session
from app.core.errors import ApplicationError
from app.core.security import TokenIdentity, authenticated_identity, current_actor
from app.main import app
from app.modules.academic.application import published_courses, save_course
from app.modules.academic.models import AuditLog, Course, Unit
from app.modules.academic.schemas import CourseInput

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def session() -> Generator[Session]:
    url = os.environ.get("SCHOOL_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Configure SCHOOL_TEST_DATABASE_URL para PostgreSQL exclusivo de teste.")
    # No drop or truncate: caller must provide a fresh disposable database.
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        check=True,
        cwd=Path(__file__).resolve().parents[1],
        env={**os.environ, "SCHOOL_DATABASE_URL": url},
    )
    engine = create_engine(url)
    with Session(engine) as connection:
        yield connection
    engine.dispose()


def test_seed_is_idempotent_and_preserves_editorial_changes(session: Session) -> None:
    seed_curriculum(session)
    course = session.scalar(select(Course).where(Course.slug == "bibliologia-critica-textual"))
    assert course is not None
    course.description = "Alteração editorial preservada"
    session.commit()
    seed_curriculum(session)
    assert session.scalar(select(func.count()).select_from(Unit)) == 10
    assert course.description == "Alteração editorial preservada"


def test_course_transaction_and_duplicate_slug(session: Session) -> None:
    user = provision_user(session, "https://test.example", str(uuid4()), "Admin", "admin")
    slug = f"curso-{uuid4().hex}"
    course = save_course(session, CourseInput(title="Curso de teste", slug=slug), user.id)
    assert course.status == "draft"
    assert course not in published_courses(session, 0, 100)
    assert session.scalar(select(AuditLog).where(AuditLog.resource_id == course.id)) is not None
    with pytest.raises(ApplicationError) as exc:
        save_course(session, CourseInput(title="Duplicado", slug=slug), user.id)
    assert exc.value.status_code == 409
    assert session.scalar(select(func.count()).select_from(Course).where(Course.slug == slug)) == 1


def test_blocked_user_and_unprovisioned_identity_are_denied(session: Session) -> None:
    user = provision_user(session, "https://test.example", str(uuid4()), "Aluno", "student")
    identity = TokenIdentity(user.auth_issuer, user.auth_subject)
    assert current_actor(identity, session).id == user.id
    user.active = False
    session.commit()
    for candidate in (identity, TokenIdentity("https://test.example", "nonexistent")):
        with pytest.raises(HTTPException) as exc:
            current_actor(candidate, session)
        assert exc.value.status_code == 403


def test_database_enforces_status_constraint(session: Session) -> None:
    session.add(Course(title="Inválido", slug=f"invalido-{uuid4().hex}", status="anything"))
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()


def test_http_admin_workflow_and_teacher_denial(session: Session) -> None:
    admin = provision_user(session, "https://test.example", str(uuid4()), "Admin API", "admin")
    teacher = provision_user(session, "https://test.example", str(uuid4()), "Professor", "teacher")
    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[authenticated_identity] = lambda: TokenIdentity(
        teacher.auth_issuer,
        teacher.auth_subject,
    )
    try:
        with TestClient(app) as client:
            payload = {"title": "Curso via API", "slug": f"api-{uuid4().hex}", "status": "draft"}
            assert client.post("/api/v1/admin/courses", json=payload).status_code == 403
            app.dependency_overrides[authenticated_identity] = lambda: TokenIdentity(
                admin.auth_issuer,
                admin.auth_subject,
            )
            created = client.post("/api/v1/admin/courses", json=payload)
            assert created.status_code == 201
            course_id = created.json()["id"]
            assert course_id not in [c["id"] for c in client.get("/api/v1/courses").json()]
            payload["status"] = "published"
            assert client.put(f"/api/v1/admin/courses/{course_id}", json=payload).status_code == 200
            assert course_id in [c["id"] for c in client.get("/api/v1/courses").json()]
            assert client.get("/api/v1/me").json()["roles"] == ["admin"]
    finally:
        app.dependency_overrides.clear()

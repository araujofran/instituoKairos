import os
from collections.abc import Generator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.core.security import Actor, current_actor
from app.main import app
from app.modules.academic.domain import Role
from app.modules.academic.schemas import CourseInput, CourseResourceInput


def test_anonymous_cannot_mutate_course_resources() -> None:
    course_id = uuid4()
    resource_id = uuid4()
    with TestClient(app) as client:
        r_post = client.post(
            f"/api/v1/admin/courses/{course_id}/resources",
            json={
                "section": "video",
                "title": "Aula 1",
                "url": "https://www.youtube.com/watch?v=abc123",
            },
        )
        assert r_post.status_code == 401
        r_put = client.put(
            f"/api/v1/admin/resources/{resource_id}",
            json={
                "section": "video",
                "title": "Aula 1",
                "url": "https://www.youtube.com/watch?v=abc123",
            },
        )
        assert r_put.status_code == 401
        r_del = client.delete(f"/api/v1/admin/resources/{resource_id}")
        assert r_del.status_code == 401


def test_student_and_teacher_cannot_mutate_course_resources() -> None:
    course_id = uuid4()
    for role in (Role.STUDENT, Role.TEACHER):
        app.dependency_overrides[current_actor] = lambda r=role: Actor(
            uuid4(), "Usuário", frozenset({r})
        )
        try:
            with TestClient(app) as client:
                r = client.post(
                    f"/api/v1/admin/courses/{course_id}/resources",
                    json={
                        "section": "video",
                        "title": "Aula 1",
                        "url": "https://www.youtube.com/watch?v=abc123",
                    },
                )
                assert r.status_code == 403
        finally:
            app.dependency_overrides.clear()


def test_resource_schema_rejects_non_https_url() -> None:
    with pytest.raises(ValidationError):
        CourseResourceInput(
            section="video",
            title="Link inseguro",
            url="javascript:alert(1)",
        )


def test_admin_can_crud_course_resources_in_postgres() -> None:
    db_url = os.environ.get("SCHOOL_TEST_DATABASE_URL")
    if not db_url:
        pytest.skip("Configure SCHOOL_TEST_DATABASE_URL para teste com PostgreSQL.")
    engine = create_engine(db_url)
    admin_id = uuid4()

    def override_session() -> Generator[Session]:
        with Session(engine) as s:
            yield s

    from app.cli import provision_user
    from app.modules.academic.application import save_course

    with Session(engine) as s:
        provision_user(s, "https://test.example", f"admin-{admin_id}", "Admin CRUD", "admin")
        admin_user = s.query(
            __import__("app.modules.academic.models", fromlist=["Identity"]).Identity
        ).filter_by(auth_subject=f"admin-{admin_id}").one()
        course = save_course(
            s,
            CourseInput(
                title="Curso Teste CRUD",
                slug=f"curso-crud-{uuid4().hex[:8]}",
                level="Nível Básico",
                status="published",
            ),
            admin_user.id,
        )
        course_id = course.id
        real_admin_id = admin_user.id

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[current_actor] = lambda: Actor(
        real_admin_id, "Admin CRUD", frozenset({Role.ADMIN})
    )
    try:
        with TestClient(app) as client:
            pl = client.post(
                f"/api/v1/admin/courses/{course_id}/resources",
                json={
                    "section": "playlist",
                    "title": "Playlist Teste",
                    "channel": "Canal Teste",
                    "url": "https://www.youtube.com/playlist?list=PL12345",
                    "position": 1,
                    "status": "published",
                },
            )
            assert pl.status_code == 201
            pl_id = pl.json()["id"]

            vid = client.post(
                f"/api/v1/admin/courses/{course_id}/resources",
                json={
                    "section": "video",
                    "playlist_id": pl_id,
                    "title": "Aula Original",
                    "channel": "Canal Teste",
                    "duration": "10:00",
                    "url": "https://www.youtube.com/watch?v=orig123",
                    "position": 1,
                    "status": "published",
                },
            )
            assert vid.status_code == 201
            vid_id = vid.json()["id"]

            updated = client.put(
                f"/api/v1/admin/resources/{vid_id}",
                json={
                    "section": "video",
                    "playlist_id": pl_id,
                    "title": "Aula Trocada",
                    "channel": "Canal Novo",
                    "duration": "12:30",
                    "url": "https://www.youtube.com/watch?v=novo456",
                    "position": 1,
                    "status": "published",
                },
            )
            assert updated.status_code == 200
            assert updated.json()["title"] == "Aula Trocada"

            bundle = client.get(f"/api/v1/courses/{course_id}/resources")
            assert bundle.status_code == 200
            assert bundle.json()["playlists"][0]["lessons"][0]["title"] == "Aula Trocada"

            deleted = client.delete(f"/api/v1/admin/resources/{vid_id}")
            assert deleted.status_code == 204
    finally:
        app.dependency_overrides.clear()
        engine.dispose()

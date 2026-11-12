import os
import subprocess
import sys
from collections.abc import Generator
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.security import Actor
from app.main import app
from app.modules.academic.dashboard import dashboard
from app.modules.academic.domain import Role
from app.modules.academic.models import (
    Assignment,
    AssignmentSubmission,
    ClassSession,
    Cohort,
    CohortTeacher,
    Course,
    EducationalMaterial,
    Enrollment,
    Identity,
    Lesson,
    LessonCompletion,
    Module,
    Unit,
    VideoRecording,
)

pytestmark = pytest.mark.integration


@pytest.fixture
def academic_data() -> Generator[tuple[Session, Actor, Actor, Enrollment, Lesson, ClassSession]]:
    url = os.environ.get("SCHOOL_TEST_DATABASE_URL")
    if not url:
        pytest.skip("PostgreSQL exclusivo de teste necessário.")
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        check=True,
        cwd=Path(__file__).resolve().parents[1],
        env={**os.environ, "SCHOOL_DATABASE_URL": url},
    )
    engine = create_engine(url)
    with Session(engine) as session:
        alice = Identity(
            auth_issuer="https://test.example", auth_subject=str(uuid4()), display_name="Alice"
        )
        bob = Identity(
            auth_issuer="https://test.example", auth_subject=str(uuid4()), display_name="Bob"
        )
        session.add_all([alice, bob])
        course = Course(title="Curso com dados reais", slug=uuid4().hex, status="published")
        session.add(course)
        session.flush()
        module = Module(course_id=course.id, title="Módulo", position=1)
        session.add(module)
        session.flush()
        unit = Unit(module_id=module.id, title="Unidade", position=1)
        session.add(unit)
        session.flush()
        lesson = Lesson(unit_id=unit.id, title="Aula", position=1)
        cohort = Cohort(course_id=course.id, title="Turma da Alice")
        other = Cohort(course_id=course.id, title="Turma do Bob")
        session.add_all([lesson, cohort, other])
        session.flush()
        enrollment = Enrollment(cohort_id=cohort.id, student_id=alice.id, status="active")
        session.add_all(
            [enrollment, Enrollment(cohort_id=other.id, student_id=bob.id, status="active")]
        )
        session.flush()
        upcoming = ClassSession(
            cohort_id=cohort.id,
            lesson_id=lesson.id,
            title="Aula da Alice",
            status="published",
            starts_at=datetime.now(UTC) + timedelta(days=1),
            join_url="https://meet.google.com/abc-defg-hij",
        )
        hidden = ClassSession(
            cohort_id=other.id,
            lesson_id=lesson.id,
            title="Aula privada do Bob",
            status="published",
            starts_at=datetime.now(UTC) + timedelta(hours=1),
            join_url="https://meet.google.com/private",
        )
        draft = ClassSession(
            cohort_id=cohort.id,
            lesson_id=lesson.id,
            title="Rascunho",
            status="draft",
            starts_at=datetime.now(UTC) + timedelta(minutes=10),
        )
        session.add_all([upcoming, hidden, draft])
        session.flush()
        session.add_all(
            [
                EducationalMaterial(
                    cohort_id=cohort.id, title="Material visível", status="published"
                ),
                EducationalMaterial(
                    cohort_id=other.id, title="Material privado", status="published"
                ),
                Assignment(cohort_id=cohort.id, title="Atividade da Alice", status="published"),
                Assignment(cohort_id=other.id, title="Atividade privada", status="published"),
                VideoRecording(
                    session_id=upcoming.id,
                    title="Gravação",
                    url="https://youtube.com/watch?v=abc",
                    status="published",
                ),
            ]
        )
        session.flush()
        yield (
            session,
            Actor(alice.id, alice.display_name, frozenset({Role.STUDENT})),
            Actor(bob.id, bob.display_name, frozenset({Role.STUDENT})),
            enrollment,
            lesson,
            upcoming,
        )
        session.rollback()  # Isolated fixture data never enters the development database.
    engine.dispose()


def test_dashboard_is_scoped_and_reacts_to_persisted_changes(
    academic_data: tuple[Session, Actor, Actor, Enrollment, Lesson, ClassSession],
) -> None:
    session, alice, bob, enrollment, lesson, upcoming = academic_data
    result = dashboard(session, alice)
    assert result.metrics.students == 1
    assert result.metrics.courses == 1
    assert result.metrics.recordings == 1
    assert result.metrics.live_sessions == 1
    assert result.next_session is not None and result.next_session.title == "Aula da Alice"
    assert [m.title for m in result.materials] == ["Material visível"]
    assert [a.title for a in result.assignments] == ["Atividade da Alice"]
    assert result.current_course is not None and result.current_course.percent == 0
    session.add(LessonCompletion(enrollment_id=enrollment.id, lesson_id=lesson.id))
    session.add(
        AssignmentSubmission(assignment_id=result.assignments[0].id, enrollment_id=enrollment.id)
    )
    upcoming.status = "cancelled"
    session.flush()
    changed = dashboard(session, alice)
    assert changed.current_course is not None and changed.current_course.percent == 100
    assert changed.assignments[0].submitted
    assert changed.next_session is None
    assert changed.metrics.live_sessions == 0
    assert changed.metrics.recordings == 0
    bobs_result = dashboard(session, bob)
    assert bobs_result.next_session is not None
    assert bobs_result.next_session.title == "Aula privada do Bob"
    assert bobs_result.materials[0].title == "Material privado"


def test_teacher_only_sees_assigned_cohorts_and_unenrolled_has_no_progress(
    academic_data: tuple[Session, Actor, Actor, Enrollment, Lesson, ClassSession],
) -> None:
    session, alice, bob, enrollment, lesson, upcoming = academic_data
    teacher = Actor(bob.id, "Professor", frozenset({Role.TEACHER}))
    session.add(CohortTeacher(cohort_id=upcoming.cohort_id, teacher_id=teacher.id))
    session.flush()
    result = dashboard(session, teacher)
    assert {s.title for s in result.agenda} == {"Aula da Alice", "Aula privada do Bob"}
    # A teacher with no enrollment or assignment gets no cohort data.
    outsider = Actor(uuid4(), "Professor sem turma", frozenset({Role.TEACHER}))
    empty = dashboard(session, outsider)
    assert empty.metrics.students == 0
    assert empty.metrics.completion_rate is None
    assert empty.current_course is None
    assert empty.next_session is None
    assert not empty.materials and not empty.assignments


def test_dashboard_requires_authentication() -> None:
    with TestClient(app) as client:
        assert client.get("/api/v1/dashboard").status_code == 401

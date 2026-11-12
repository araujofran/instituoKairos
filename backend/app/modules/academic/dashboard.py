from datetime import UTC, datetime, timedelta
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import Actor
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
from app.modules.identity.models import ContentAsset


class DashboardMetrics(BaseModel):
    students: int
    courses: int
    recordings: int
    live_sessions: int
    completion_rate: float | None


class SessionSummary(BaseModel):
    id: UUID
    title: str
    description: str
    course_title: str
    starts_at: datetime
    duration_minutes: int
    join_url: str | None
    enrolled_students: int


class MaterialSummary(BaseModel):
    id: UUID
    title: str
    kind: str
    size_bytes: int | None
    external_url: str | None
    download_id: UUID | None = None


class AssignmentSummary(BaseModel):
    id: UUID
    title: str
    due_at: datetime | None
    submitted: bool


class CourseProgress(BaseModel):
    id: UUID
    title: str
    cohort_title: str
    completed_lessons: int
    total_lessons: int
    percent: float | None


class DashboardOutput(BaseModel):
    metrics: DashboardMetrics
    next_session: SessionSummary | None
    current_course: CourseProgress | None
    materials: list[MaterialSummary]
    assignments: list[AssignmentSummary]
    agenda: list[SessionSummary]
    updated_at: datetime


def dashboard(session: Session, actor: Actor) -> DashboardOutput:
    now = datetime.now(UTC)
    # Scope every panel before querying rows; never expose global metrics to a student.
    if actor.roles.intersection({Role.ADMIN, Role.COORDINATOR}):
        cohort_ids = list(session.scalars(select(Cohort.id)))
    else:
        own = select(Enrollment.cohort_id).where(
            Enrollment.student_id == actor.id,
            Enrollment.status.in_(["active", "completed"]),
        )
        cohort_ids = list(session.scalars(own))
        if Role.TEACHER in actor.roles:
            cohort_ids += list(
                session.scalars(
                    select(CohortTeacher.cohort_id).where(CohortTeacher.teacher_id == actor.id)
                )
            )
    cohort_ids = list(set(cohort_ids))
    valid_enrollments = select(Enrollment).where(
        Enrollment.cohort_id.in_(cohort_ids),
        Enrollment.status.in_(["active", "completed"]),
    )
    enrollment_rows = list(session.scalars(valid_enrollments))
    # Student metric is their own identity; teachers/admin see students of authorized cohorts.
    if not actor.roles.intersection({Role.ADMIN, Role.COORDINATOR, Role.TEACHER}):
        enrollment_rows = [e for e in enrollment_rows if e.student_id == actor.id]
    student_ids = {e.student_id for e in enrollment_rows}
    students = (
        session.scalar(
            select(func.count())
            .select_from(Identity)
            .where(
                Identity.id.in_(student_ids),
                Identity.active.is_(True),
            )
        )
        or 0
    )
    completed = sum(e.status == "completed" for e in enrollment_rows)
    if actor.roles.intersection({Role.ADMIN, Role.COORDINATOR}):
        courses = (
            session.scalar(
                select(func.count())
                .select_from(Course)
                .where(
                    Course.status != "archived",
                )
            )
            or 0
        )
    else:
        courses = (
            session.scalar(
                select(func.count(func.distinct(Cohort.course_id))).where(
                    Cohort.id.in_(cohort_ids),
                )
            )
            or 0
        )
    recordings = (
        session.scalar(
            select(func.count())
            .select_from(VideoRecording)
            .join(
                ClassSession,
                VideoRecording.session_id == ClassSession.id,
            )
            .where(
                ClassSession.cohort_id.in_(cohort_ids),
                VideoRecording.status == "published",
                ClassSession.status.in_(["published", "completed"]),
            )
        )
        or 0
    )
    live_count = (
        session.scalar(
            select(func.count())
            .select_from(ClassSession)
            .where(
                ClassSession.cohort_id.in_(cohort_ids),
                ClassSession.status == "published",
                ClassSession.starts_at >= now,
            )
        )
        or 0
    )
    upcoming = session.execute(
        select(ClassSession, Course.title)
        .join(
            Cohort,
            ClassSession.cohort_id == Cohort.id,
        )
        .join(Course, Cohort.course_id == Course.id)
        .where(
            ClassSession.cohort_id.in_(cohort_ids),
            ClassSession.status == "published",
            ClassSession.starts_at >= now - timedelta(hours=24),
        )
        .order_by(ClassSession.starts_at, ClassSession.id)
        .limit(100)
    ).all()
    visible = [
        (s, title)
        for s, title in upcoming
        if s.starts_at + timedelta(minutes=s.duration_minutes) > now
    ]
    counts: dict[UUID, int] = {
        cohort_id: count
        for cohort_id, count in session.execute(
            select(Enrollment.cohort_id, func.count())
            .where(
                Enrollment.cohort_id.in_(cohort_ids),
                Enrollment.status == "active",
            )
            .group_by(Enrollment.cohort_id)
        ).all()
    }

    def summary(s: ClassSession, title: str) -> SessionSummary:
        return SessionSummary(
            id=s.id,
            title=s.title,
            description=s.description,
            course_title=title,
            starts_at=s.starts_at,
            duration_minutes=s.duration_minutes,
            join_url=s.join_url,
            enrolled_students=counts.get(s.cohort_id, 0),
        )

    next_session = summary(*visible[0]) if visible else None
    agenda = [summary(s, title) for s, title in visible if s.starts_at <= now + timedelta(days=7)]
    material_rows = session.scalars(
        select(EducationalMaterial)
        .where(
            EducationalMaterial.cohort_id.in_(cohort_ids),
            EducationalMaterial.status == "published",
        )
        .order_by(EducationalMaterial.created_at.desc(), EducationalMaterial.id)
        .limit(5)
    )
    materials = [
        MaterialSummary(
            id=m.id,
            title=m.title,
            kind=m.kind,
            size_bytes=m.size_bytes,
            external_url=m.external_url,
        )
        for m in material_rows
    ]
    uploads_query = select(ContentAsset).where(ContentAsset.status == "published")
    if not actor.roles.intersection({Role.ADMIN, Role.COORDINATOR}):
        authorized_courses = select(Cohort.course_id).where(Cohort.id.in_(cohort_ids))
        uploads_query = uploads_query.where(ContentAsset.course_id.in_(authorized_courses))
    uploaded = list(
        session.scalars(
            uploads_query.order_by(
                ContentAsset.created_at.desc(),
                ContentAsset.id,
            ).limit(5)
        )
    )
    materials = [
        MaterialSummary(
            id=a.id,
            title=a.title,
            kind=a.kind,
            size_bytes=a.size_bytes,
            external_url=None,
            download_id=a.id,
        )
        for a in uploaded
    ] + materials
    materials = materials[:5]
    upload_count = (
        select(func.count())
        .select_from(ContentAsset)
        .where(
            ContentAsset.status == "published",
            ContentAsset.kind == "video",
        )
    )
    if not actor.roles.intersection({Role.ADMIN, Role.COORDINATOR}):
        upload_count = upload_count.where(
            ContentAsset.course_id.in_(
                select(Cohort.course_id).where(Cohort.id.in_(cohort_ids)),
            )
        )
    recordings += session.scalar(upload_count) or 0
    assignment_rows = session.scalars(
        select(Assignment)
        .where(
            Assignment.cohort_id.in_(cohort_ids),
            Assignment.status == "published",
        )
        .order_by(Assignment.due_at.asc().nulls_last(), Assignment.id)
        .limit(5)
    )
    own_enrollments = [e.id for e in enrollment_rows if e.student_id == actor.id]
    submitted_ids = set(
        session.scalars(
            select(AssignmentSubmission.assignment_id).where(
                AssignmentSubmission.enrollment_id.in_(own_enrollments),
            )
        )
    )
    assignments = [
        AssignmentSummary(
            id=a.id,
            title=a.title,
            due_at=a.due_at,
            submitted=a.id in submitted_ids,
        )
        for a in assignment_rows
    ]
    current = session.execute(
        select(Enrollment, Cohort, Course)
        .join(
            Cohort,
            Enrollment.cohort_id == Cohort.id,
        )
        .join(Course, Cohort.course_id == Course.id)
        .where(
            Enrollment.student_id == actor.id,
            Enrollment.status == "active",
            Course.status == "published",
        )
        .order_by(Course.title, Enrollment.id)
        .limit(1)
    ).first()
    progress = None
    if current:
        enrollment, cohort, course = current
        lesson_ids = (
            select(Lesson.id)
            .join(Unit, Lesson.unit_id == Unit.id)
            .join(
                Module,
                Unit.module_id == Module.id,
            )
            .where(Module.course_id == course.id)
        )
        total = session.scalar(select(func.count()).select_from(lesson_ids.subquery())) or 0
        done = (
            session.scalar(
                select(func.count())
                .select_from(LessonCompletion)
                .where(
                    LessonCompletion.enrollment_id == enrollment.id,
                    LessonCompletion.lesson_id.in_(lesson_ids),
                )
            )
            or 0
        )
        progress = CourseProgress(
            id=course.id,
            title=course.title,
            cohort_title=cohort.title,
            completed_lessons=done,
            total_lessons=total,
            percent=round(done / total * 100, 1) if total else None,
        )
    return DashboardOutput(
        metrics=DashboardMetrics(
            students=students,
            courses=courses,
            recordings=recordings,
            live_sessions=live_count,
            completion_rate=round(completed / len(enrollment_rows) * 100, 1)
            if enrollment_rows
            else None,
        ),
        next_session=next_session,
        current_course=progress,
        materials=materials,
        assignments=assignments,
        agenda=agenda[:5],
        updated_at=now,
    )

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ApplicationError
from app.modules.academic.models import AuditLog, Course, CourseResource
from app.modules.academic.schemas import (
    CourseInput,
    CourseOutput,
    CourseResourceInput,
    CourseResourceOutput,
    CourseResourcesBundleOutput,
    PlaylistWithLessonsOutput,
)


def save_course(
    session: Session,
    data: CourseInput,
    actor_id: UUID,
    course_id: UUID | None = None,
) -> Course:
    course = session.get(Course, course_id) if course_id else Course()
    if course is None:
        raise ApplicationError("Curso não encontrado.", 404)
    for field, value in data.model_dump().items():
        setattr(course, field, value)
    session.add(course)
    try:
        session.flush()
        session.add(
            AuditLog(
                actor_id=actor_id,
                action="course.updated" if course_id else "course.created",
                resource_id=course.id,
            )
        )
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise ApplicationError("Este identificador já está em uso.", 409) from exc
    session.refresh(course)
    return course


def published_courses(session: Session, offset: int, limit: int) -> list[Course]:
    return list(
        session.scalars(
            select(Course)
            .where(Course.status == "published")
            .order_by(Course.created_at, Course.title, Course.id)
            .offset(offset)
            .limit(limit)
        )
    )


def get_course_resources_bundle(
    session: Session, course_id: UUID, *, include_drafts: bool = False
) -> CourseResourcesBundleOutput:
    course = session.get(Course, course_id)
    if course is None or (not include_drafts and course.status != "published"):
        raise ApplicationError("Curso não encontrado.", 404)

    stmt = (
        select(CourseResource)
        .where(CourseResource.course_id == course_id)
        .order_by(CourseResource.position, CourseResource.created_at, CourseResource.id)
    )
    if not include_drafts:
        stmt = stmt.where(CourseResource.status.in_(["published", "pending_url"]))
    rows = list(session.scalars(stmt))

    official: list[CourseResourceOutput] = []
    playlists_map: dict[UUID, PlaylistWithLessonsOutput] = {}
    playlists_order: list[UUID] = []
    orphan_lessons: list[CourseResourceOutput] = []
    videos: list[CourseResourceOutput] = []
    pending: list[CourseResourceOutput] = []

    for row in rows:
        item = CourseResourceOutput.model_validate(row)
        if row.section == "official":
            official.append(item)
        elif row.section == "playlist" and row.playlist_id is None:
            playlists_map[row.id] = PlaylistWithLessonsOutput(**item.model_dump(), lessons=[])
            playlists_order.append(row.id)
        elif row.section == "pending":
            pending.append(item)
        elif row.playlist_id is not None:
            if row.playlist_id in playlists_map:
                playlists_map[row.playlist_id].lessons.append(item)
            else:
                orphan_lessons.append(item)
        else:
            videos.append(item)

    for lesson in orphan_lessons:
        if lesson.playlist_id and lesson.playlist_id in playlists_map:
            playlists_map[lesson.playlist_id].lessons.append(lesson)
        else:
            videos.append(lesson)

    return CourseResourcesBundleOutput(
        course=CourseOutput.model_validate(course),
        official=official,
        playlists=[playlists_map[pid] for pid in playlists_order],
        videos=videos,
        pending=pending,
    )


def save_course_resource(
    session: Session,
    data: CourseResourceInput,
    actor_id: UUID,
    *,
    course_id: UUID | None = None,
    resource_id: UUID | None = None,
) -> CourseResource:
    if resource_id is not None:
        resource = session.get(CourseResource, resource_id)
        if resource is None:
            raise ApplicationError("Recurso não encontrado.", 404)
        target_course_id = resource.course_id
    else:
        if course_id is None or session.get(Course, course_id) is None:
            raise ApplicationError("Curso não encontrado.", 404)
        resource = CourseResource(course_id=course_id)
        target_course_id = course_id

    if data.playlist_id is not None:
        parent = session.get(CourseResource, data.playlist_id)
        if parent is None or parent.course_id != target_course_id or parent.section != "playlist":
            raise ApplicationError("Playlist informada não pertence a este curso.", 400)

    for field, value in data.model_dump().items():
        setattr(resource, field, value)
    session.add(resource)
    session.flush()
    session.add(
        AuditLog(
            actor_id=actor_id,
            action="course_resource.updated" if resource_id else "course_resource.created",
            resource_id=resource.id,
        )
    )
    session.commit()
    session.refresh(resource)
    return resource


def delete_course_resource(session: Session, resource_id: UUID, actor_id: UUID) -> None:
    resource = session.get(CourseResource, resource_id)
    if resource is None:
        raise ApplicationError("Recurso não encontrado.", 404)
    session.add(
        AuditLog(
            actor_id=actor_id,
            action="course_resource.deleted",
            resource_id=resource.id,
        )
    )
    session.delete(resource)
    session.commit()

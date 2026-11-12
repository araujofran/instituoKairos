from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.core.security import Actor, course_administrator, current_actor
from app.modules.academic.application import (
    delete_course_resource,
    get_course_resources_bundle,
    published_courses,
    save_course,
    save_course_resource,
)
from app.modules.academic.dashboard import DashboardOutput, dashboard
from app.modules.academic.models import Course, CourseResource
from app.modules.academic.schemas import (
    CourseInput,
    CourseOutput,
    CourseResourceInput,
    CourseResourceOutput,
    CourseResourcesBundleOutput,
)

router = APIRouter(prefix="/api/v1", tags=["Cursos"])
Database = Annotated[Session, Depends(get_session)]
Admin = Annotated[Actor, Depends(course_administrator)]


@router.get("/dashboard", response_model=DashboardOutput, tags=["Painel"])
def academic_dashboard(
    actor: Annotated[Actor, Depends(current_actor)], session: Database
) -> DashboardOutput:
    return dashboard(session, actor)


@router.get("/courses", response_model=list[CourseOutput])
def catalog(
    session: Database,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
) -> list[Course]:
    return published_courses(session, offset, limit)


@router.get("/courses/{course_id}/resources", response_model=CourseResourcesBundleOutput)
def public_course_resources(course_id: UUID, session: Database) -> CourseResourcesBundleOutput:
    return get_course_resources_bundle(session, course_id, include_drafts=False)


@router.get("/admin/courses", response_model=list[CourseOutput])
def admin_courses(
    actor: Admin,
    session: Database,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
) -> list[Course]:
    return list(
        session.scalars(
            select(Course)
            .order_by(Course.created_at, Course.title, Course.id)
            .offset(offset)
            .limit(limit)
        )
    )


@router.post("/admin/courses", response_model=CourseOutput, status_code=201)
def create_course(data: CourseInput, actor: Admin, session: Database) -> Course:
    return save_course(session, data, actor.id)


@router.put("/admin/courses/{course_id}", response_model=CourseOutput)
def update_course(course_id: UUID, data: CourseInput, actor: Admin, session: Database) -> Course:
    return save_course(session, data, actor.id, course_id)


@router.get("/admin/courses/{course_id}/resources", response_model=CourseResourcesBundleOutput)
def admin_course_resources(
    course_id: UUID, actor: Admin, session: Database
) -> CourseResourcesBundleOutput:
    return get_course_resources_bundle(session, course_id, include_drafts=True)


@router.post(
    "/admin/courses/{course_id}/resources",
    response_model=CourseResourceOutput,
    status_code=201,
)
def create_course_resource(
    course_id: UUID, data: CourseResourceInput, actor: Admin, session: Database
) -> CourseResource:
    return save_course_resource(session, data, actor.id, course_id=course_id)


@router.put("/admin/resources/{resource_id}", response_model=CourseResourceOutput)
def update_course_resource(
    resource_id: UUID, data: CourseResourceInput, actor: Admin, session: Database
) -> CourseResource:
    return save_course_resource(session, data, actor.id, resource_id=resource_id)


@router.delete("/admin/resources/{resource_id}", status_code=204)
def remove_course_resource(resource_id: UUID, actor: Admin, session: Database) -> None:
    delete_course_resource(session, resource_id, actor.id)

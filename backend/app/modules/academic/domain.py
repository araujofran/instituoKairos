from enum import StrEnum


class Role(StrEnum):
    ADMIN = "admin"
    COORDINATOR = "coordinator"
    TEACHER = "teacher"
    STUDENT = "student"


def can_manage_course(roles: set[Role]) -> bool:
    return bool(roles & {Role.ADMIN, Role.COORDINATOR})


def can_manage_cohort(roles: set[Role], *, assigned: bool) -> bool:
    return bool(roles & {Role.ADMIN, Role.COORDINATOR}) or (Role.TEACHER in roles and assigned)

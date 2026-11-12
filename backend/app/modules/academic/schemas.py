from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CourseInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    title: str = Field(min_length=3, max_length=200)
    slug: str = Field(min_length=3, max_length=220, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    description: str = Field(default="", max_length=10000)
    level: str = Field(default="Geral", min_length=2, max_length=80)
    status: Literal["draft", "published", "archived"] = "draft"


class CourseOutput(CourseInput):
    model_config = ConfigDict(from_attributes=True)
    id: UUID


class CourseResourceInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    section: Literal["official", "playlist", "video", "pending"]
    playlist_id: UUID | None = None
    title: str = Field(min_length=2, max_length=300)
    channel: str = Field(default="", max_length=200)
    duration: str = Field(default="", max_length=60)
    url: str | None = Field(default=None, max_length=1000)
    description: str = Field(default="", max_length=4000)
    position: int = Field(default=1, ge=1, le=5000)
    status: Literal["published", "draft", "pending_url", "unavailable"] = "published"

    @field_validator("url")
    @classmethod
    def validate_https_url(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        if not value.startswith("https://"):
            raise ValueError("Informe uma URL segura começando com https://.")
        return value


class CourseResourceOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    course_id: UUID
    playlist_id: UUID | None
    section: str
    title: str
    channel: str
    duration: str
    url: str | None
    description: str
    position: int
    status: str


class PlaylistWithLessonsOutput(CourseResourceOutput):
    lessons: list[CourseResourceOutput] = []


class CourseResourcesBundleOutput(BaseModel):
    course: CourseOutput
    official: list[CourseResourceOutput]
    playlists: list[PlaylistWithLessonsOutput]
    videos: list[CourseResourceOutput]
    pending: list[CourseResourceOutput]

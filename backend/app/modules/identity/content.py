import codecs
import hashlib
import mimetypes
import zipfile
from pathlib import Path
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import get_settings
from app.core.database import get_engine
from app.core.security import Actor, current_actor
from app.modules.academic.domain import Role
from app.modules.academic.models import AuditLog, Cohort, Course, Enrollment, Identity, UserRole
from app.modules.identity.local_auth import Database
from app.modules.identity.models import ContentAsset

router = APIRouter(prefix="/api/v1/content", tags=["Conteúdos e uploads"])
ALLOWED = {
    ".pdf",
    ".mp4",
    ".webm",
    ".mov",
    ".mp3",
    ".wav",
    ".ogg",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".ppt",
    ".pptx",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".txt",
    ".csv",
    ".zip",
}


def manager(actor: Annotated[Actor, Depends(current_actor)]) -> Actor:
    if not actor.roles.intersection({Role.ADMIN, Role.COORDINATOR}):
        raise HTTPException(
            403, "Somente administrador e coordenador podem enviar ou publicar conteúdos."
        )
    return actor


Manager = Annotated[Actor, Depends(manager)]


def preflight_upload(request: Request) -> None:
    """Authenticate/authorize before the framework parses and spools a multipart body."""
    header = request.headers.get("authorization", "")
    credentials = (
        HTTPAuthorizationCredentials(scheme="Bearer", credentials=header[7:])
        if header.startswith("Bearer ")
        else None
    )
    identity = security.authenticated_identity(request, credentials, get_settings())
    with Session(get_engine()) as session:
        user = session.scalar(
            select(Identity).where(
                Identity.auth_issuer == identity.issuer,
                Identity.auth_subject == identity.subject,
            )
        )
        if (
            user is None
            or not user.active
            or user.account_status != "active"
            or user.must_change_credentials
        ):
            raise HTTPException(403, "Conta ainda não liberada para uploads.")
        roles = set(session.scalars(select(UserRole.role).where(UserRole.user_id == user.id)))
        if not roles.intersection({"admin", "coordinator"}):
            raise HTTPException(403, "Somente administrador e coordenador podem enviar conteúdos.")


class ContentOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    course_id: UUID | None
    title: str
    kind: str
    original_name: str
    size_bytes: int
    status: str
    content_type: str


class ContentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    title: str = Field(min_length=3, max_length=200)
    course_id: UUID | None = None
    status: Literal["draft", "published", "archived"]


def permitted_courses(session: Database, actor: Actor) -> list[UUID]:
    return list(
        session.scalars(
            select(Cohort.course_id)
            .join(
                Enrollment,
                Enrollment.cohort_id == Cohort.id,
            )
            .join(Course, Cohort.course_id == Course.id)
            .where(
                Enrollment.student_id == actor.id,
                Enrollment.status.in_(["active", "completed"]),
                Course.status == "published",
            )
        )
    )


@router.get("", response_model=list[ContentOutput])
def list_content(
    actor: Annotated[Actor, Depends(current_actor)],
    session: Database,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[ContentAsset]:
    statement = select(ContentAsset)
    if not actor.roles.intersection({Role.ADMIN, Role.COORDINATOR}):
        statement = statement.where(
            ContentAsset.status == "published",
            ContentAsset.course_id.in_(permitted_courses(session, actor)),
        )
    return list(
        session.scalars(
            statement.order_by(ContentAsset.created_at.desc(), ContentAsset.id)
            .offset(offset)
            .limit(limit)
        )
    )


def validate_file(path: Path, extension: str) -> None:
    with path.open("rb") as stream:
        head = stream.read(32)
    valid = True
    if extension == ".pdf":
        valid = head.startswith(b"%PDF-")
    elif extension == ".png":
        valid = head.startswith(b"\x89PNG\r\n\x1a\n")
    elif extension in {".jpg", ".jpeg"}:
        valid = head.startswith(b"\xff\xd8\xff")
    elif extension == ".webp":
        valid = head.startswith(b"RIFF") and head[8:12] == b"WEBP"
    elif extension in {".mp4", ".mov"}:
        valid = head[4:8] == b"ftyp"
    elif extension == ".webm":
        valid = head.startswith(b"\x1aE\xdf\xa3")
    elif extension == ".wav":
        valid = head.startswith(b"RIFF") and head[8:12] == b"WAVE"
    elif extension == ".ogg":
        valid = head.startswith(b"OggS")
    elif extension == ".mp3":
        valid = head.startswith(b"ID3") or (
            len(head) > 1 and head[0] == 255 and head[1] & 224 == 224
        )
    elif extension in {".doc", ".xls", ".ppt"}:
        valid = head.startswith(b"\xd0\xcf\x11\xe0")
    elif extension in {".zip", ".docx", ".pptx", ".xlsx"}:
        valid = zipfile.is_zipfile(path)
    elif extension in {".txt", ".csv"}:
        try:
            decoder = codecs.getincrementaldecoder("utf-8")()
            with path.open("rb") as stream:
                while chunk := stream.read(65536):
                    decoded = decoder.decode(chunk)
                    if "\x00" in decoded:
                        valid = False
                decoder.decode(b"", final=True)
        except UnicodeDecodeError:
            valid = False
    if not valid:
        raise HTTPException(422, "O conteúdo do arquivo não corresponde ao formato informado.")


@router.post("", response_model=ContentOutput, status_code=201)
def upload_content(
    file: UploadFile,
    actor: Manager,
    session: Database,
    title: Annotated[str, Form(min_length=3, max_length=200)],
    course_id: Annotated[UUID | None, Form()] = None,
    status: Annotated[Literal["draft", "published"], Form()] = "draft",
) -> ContentAsset:
    if course_id is not None and session.get(Course, course_id) is None:
        raise HTTPException(404, "Curso não encontrado.")
    if status == "published" and course_id is None:
        raise HTTPException(422, "Associe o conteúdo a um curso antes de publicar.")
    name = (file.filename or "arquivo").replace("\\", "/").rsplit("/", 1)[-1]
    if ":" in name or len(name) > 255:
        raise HTTPException(422, "Nome de arquivo inválido.")
    extension = Path(name).suffix.casefold()
    if extension not in ALLOWED:
        raise HTTPException(
            422, "Formato não permitido. Envie vídeo, áudio, PDF, imagem, documento ou ZIP."
        )
    settings = get_settings()
    directory = settings.upload_directory.resolve()
    directory.mkdir(parents=True, exist_ok=True)
    key = uuid4().hex + extension
    path = directory / key
    size = 0
    digest = hashlib.sha256()
    # Serialize quota checks/uploads across API workers without requiring Redis.
    session.execute(text("SELECT pg_advisory_xact_lock(73192311)"))
    total = session.scalar(select(func.coalesce(func.sum(ContentAsset.size_bytes), 0))) or 0
    try:
        with path.open("xb") as target:
            while chunk := file.file.read(1024 * 1024):
                size += len(chunk)
                if size > settings.max_upload_bytes or total + size > settings.upload_quota_bytes:
                    raise HTTPException(413, "Limite de arquivo ou cota local atingido.")
                digest.update(chunk)
                target.write(chunk)
        if size == 0:
            raise HTTPException(422, "O arquivo está vazio.")
        validate_file(path, extension)
        kind = (
            "video"
            if extension in {".mp4", ".mov", ".webm"}
            else "audio"
            if extension in {".mp3", ".ogg", ".wav"}
            else "document"
        )
        asset = ContentAsset(
            owner_id=actor.id,
            course_id=course_id,
            title=title.strip(),
            kind=kind,
            original_name=name,
            storage_key=key,
            content_type=mimetypes.guess_type(name)[0] or "application/octet-stream",
            size_bytes=size,
            sha256=digest.hexdigest(),
            status=status,
        )
        session.add(asset)
        session.flush()
        session.add(AuditLog(actor_id=actor.id, action="content.uploaded", resource_id=asset.id))
        session.commit()
        session.refresh(asset)
        return asset
    except Exception:
        session.rollback()
        path.unlink(missing_ok=True)
        raise
    finally:
        file.file.close()


@router.put("/{asset_id}", response_model=ContentOutput)
def edit_content(
    asset_id: UUID, data: ContentUpdate, actor: Manager, session: Database
) -> ContentAsset:
    asset = session.get(ContentAsset, asset_id)
    if asset is None:
        raise HTTPException(404, "Conteúdo não encontrado.")
    if data.course_id is not None and session.get(Course, data.course_id) is None:
        raise HTTPException(404, "Curso não encontrado.")
    if data.status == "published" and data.course_id is None:
        raise HTTPException(422, "Selecione um curso antes de publicar.")
    asset.title = data.title
    asset.course_id = data.course_id
    asset.status = data.status
    session.add(AuditLog(actor_id=actor.id, action="content.updated", resource_id=asset.id))
    session.commit()
    return asset


@router.get("/{asset_id}/file")
def download_content(
    asset_id: UUID,
    actor: Annotated[Actor, Depends(current_actor)],
    session: Database,
    inline: bool = False,
) -> FileResponse:
    asset = session.get(ContentAsset, asset_id)
    allowed = actor.roles.intersection({Role.ADMIN, Role.COORDINATOR})
    if asset is None or (
        not allowed
        and (
            asset.status != "published" or asset.course_id not in permitted_courses(session, actor)
        )
    ):
        raise HTTPException(404, "Conteúdo não encontrado.")
    directory = get_settings().upload_directory.resolve()
    path = (directory / asset.storage_key).resolve()
    if path.parent != directory or not path.is_file():
        raise HTTPException(404, "Arquivo indisponível.")
    return FileResponse(
        path,
        media_type=asset.content_type,
        filename=asset.original_name,
        content_disposition_type="inline"
        if inline and asset.kind in {"video", "audio"}
        else "attachment",
        headers={"X-Content-Type-Options": "nosniff"},
    )

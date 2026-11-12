import logging
from typing import Annotated
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from starlette.concurrency import run_in_threadpool
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import Response

from app.core.config import get_settings
from app.core.database import get_engine
from app.core.errors import ApplicationError
from app.core.security import Actor, current_actor
from app.modules.academic.api import router
from app.modules.identity.content import preflight_upload
from app.modules.identity.content import router as content_router
from app.modules.identity.governance import router as governance_router
from app.modules.identity.local_auth import router as auth_router

logger = logging.getLogger("school")
settings = get_settings()
app = FastAPI(title="Escola Digital de Teologia", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Kairos-CSRF"],
)


@app.middleware("http")
async def request_context(request: Request, call_next: RequestResponseEndpoint) -> Response:
    request.state.request_id = str(uuid4())

    def reject(code: int, detail: str) -> JSONResponse:
        origin = request.headers.get("origin")
        headers = {"Cache-Control": "no-store", "X-Request-ID": request.state.request_id}
        if origin is not None and origin in settings.cors_origins:
            headers.update(
                {"Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true"}
            )
        return JSONResponse(status_code=code, content={"detail": detail}, headers=headers)

    if request.url.path == "/api/v1/content" and request.method == "POST":
        try:
            await run_in_threadpool(preflight_upload, request)
        except HTTPException as exc:
            return reject(exc.status_code, str(exc.detail))
        length = request.headers.get("content-length")
        if length is None or not length.isdigit():
            return reject(411, "Informe o tamanho do upload.")
        if int(length) > settings.max_upload_bytes + 1024 * 1024:
            return reject(413, "Arquivo acima do limite configurado.")
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and (
        request.cookies.get("kairos_session") or request.url.path.startswith("/api/v1/auth/")
    ):
        origin = request.headers.get("origin")
        if request.headers.get("X-Kairos-CSRF") != "1" or (
            origin is not None and origin not in settings.cors_origins
        ):
            return reject(403, "Requisição não autorizada. Reabra a página.")
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(SQLAlchemyError)
async def database_error(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    # Never log exception text: driver messages may contain connection details or row data.
    logger.error("database_error request_id=%s", request.state.request_id)
    return JSONResponse(status_code=503, content={"detail": "Dados temporariamente indisponíveis."})


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Revise os campos enviados.",
            "errors": [
                {"field": ".".join(map(str, e["loc"])), "type": e["type"]} for e in exc.errors()
            ],
        },
    )


@app.get("/health/live", tags=["Operação"])
def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready", tags=["Operação"])
def ready() -> dict[str, str]:
    with get_engine().connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ready"}


@app.get("/api/v1/me", tags=["Identidade"])
def me(actor: Annotated[Actor, Depends(current_actor)]) -> dict[str, object]:
    return {
        "id": str(actor.id),
        "display_name": actor.display_name,
        "roles": sorted(actor.roles),
        "avatar_url": actor.avatar_url,
    }


app.include_router(router)
app.include_router(auth_router)
app.include_router(governance_router)
app.include_router(content_router)


@app.exception_handler(ApplicationError)
async def application_error(request: Request, exc: ApplicationError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})

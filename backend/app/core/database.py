from collections.abc import Generator
from functools import lru_cache

from fastapi import HTTPException
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session

from app.core.config import get_settings


@lru_cache
def get_engine() -> Engine:
    url = get_settings().database_url
    if url is None:
        raise HTTPException(status_code=503, detail="Banco de dados ainda não configurado.")
    return create_engine(
        url.get_secret_value(),
        pool_pre_ping=True,
        pool_size=3,
        max_overflow=2,
        connect_args={"connect_timeout": 5},
    )


def get_session() -> Generator[Session]:
    with Session(get_engine()) as session:
        yield session

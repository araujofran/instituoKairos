from alembic import context
from sqlalchemy import create_engine, pool

from app.core.config import get_settings
from app.modules.academic.models import Base
from app.modules.identity import models as identity_models  # noqa: F401

url = get_settings().database_url
if url is None:
    raise RuntimeError("Configure SCHOOL_DATABASE_URL antes de executar migrações.")

if context.is_offline_mode():
    context.configure(
        url=url.get_secret_value(), target_metadata=Base.metadata,
        literal_binds=True, dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    engine = create_engine(url.get_secret_value(), poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=Base.metadata)
        with context.begin_transaction():
            context.run_migrations()

"""course_level_and_resources"""

import sqlalchemy as sa
from alembic import op

revision = "4a9d82e1c3f0"
down_revision = "ff7c642801b0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "courses",
        sa.Column("level", sa.String(length=80), server_default="Geral", nullable=False),
    )
    op.create_table(
        "course_resources",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("course_id", sa.Uuid(), nullable=False),
        sa.Column("playlist_id", sa.Uuid(), nullable=True),
        sa.Column("section", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("channel", sa.String(length=200), server_default="", nullable=False),
        sa.Column("duration", sa.String(length=60), server_default="", nullable=False),
        sa.Column("url", sa.String(length=1000), nullable=True),
        sa.Column("description", sa.Text(), server_default="", nullable=False),
        sa.Column("position", sa.Integer(), server_default="1", nullable=False),
        sa.Column("status", sa.String(length=20), server_default="published", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("section IN ('official','playlist','video','pending')"),
        sa.CheckConstraint("status IN ('published','draft','pending_url','unavailable')"),
        sa.CheckConstraint("position > 0"),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["playlist_id"], ["course_resources.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_course_resources_course_id"), "course_resources", ["course_id"])
    op.create_index(
        op.f("ix_course_resources_playlist_id"), "course_resources", ["playlist_id"]
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_course_resources_playlist_id"), table_name="course_resources")
    op.drop_index(op.f("ix_course_resources_course_id"), table_name="course_resources")
    op.drop_table("course_resources")
    op.drop_column("courses", "level")

"""add section model and section_id to student

Revision ID: 0009_add_sections
Revises: 0008_message_material_context
Create Date: 2026-10-24 01:25:00
"""
from alembic import op
import sqlalchemy as sa

revision = "0009_add_sections"
down_revision = "0008_message_material_context"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "section",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("section_code", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["course.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_section_course_id", "section", ["course_id"])
    op.create_index("ix_section_name", "section", ["name"])
    op.create_index("ix_section_section_code", "section", ["section_code"])

    with op.batch_alter_table("student") as batch:
        batch.add_column(sa.Column("section_id", sa.Integer(), nullable=True))
        batch.create_foreign_key("fk_student_section_id", "section", ["section_id"], ["id"])
        batch.create_index("ix_student_section_id", ["section_id"])


def downgrade():
    with op.batch_alter_table("student") as batch:
        batch.drop_index("ix_student_section_id")
        batch.drop_constraint("fk_student_section_id", type_="foreignkey")
        batch.drop_column("section_id")
    op.drop_index("ix_section_section_code", table_name="section")
    op.drop_index("ix_section_name", table_name="section")
    op.drop_index("ix_section_course_id", table_name="section")
    op.drop_table("section")

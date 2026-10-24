"""add material_id to message for document-specific conversations"""
from alembic import op
import sqlalchemy as sa

revision = "0008_message_material_context"
down_revision = "0007_student_research_mapping"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("message") as batch:
        batch.add_column(sa.Column("material_id", sa.Integer(), nullable=True))
        batch.create_foreign_key("fk_message_material_id", "material", ["material_id"], ["id"])
        batch.create_index("ix_message_material_id", ["material_id"])


def downgrade():
    with op.batch_alter_table("message") as batch:
        batch.drop_index("ix_message_material_id")
        batch.drop_constraint("fk_message_material_id", type_="foreignkey")
        batch.drop_column("material_id")

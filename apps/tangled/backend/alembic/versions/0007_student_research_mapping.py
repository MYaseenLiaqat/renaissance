"""add authenticated student identity and research mapping"""
from alembic import op
import sqlalchemy as sa

revision = "0007_student_research_mapping"
down_revision = "0006_insight_groups"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("student") as batch:
        batch.add_column(sa.Column("email", sa.String(), nullable=True))
        batch.add_column(sa.Column("password_hash", sa.String(), nullable=True))
        batch.create_index("ix_student_email", ["email"], unique=True)
    op.create_table(
        "learner_map",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("student.id"), nullable=False),
        sa.Column("research_learner_id", sa.Integer(), nullable=False),
        sa.Column("research_learner_token", sa.String(), nullable=False, server_default=""),
        sa.Column("research_participation_status", sa.String(), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id"),
        sa.UniqueConstraint("research_learner_id"),
    )
    op.create_index("ix_learner_map_user_id", "learner_map", ["user_id"])
    op.create_index("ix_learner_map_research_learner_id", "learner_map", ["research_learner_id"])


def downgrade():
    op.drop_table("learner_map")
    with op.batch_alter_table("student") as batch:
        batch.drop_index("ix_student_email")
        batch.drop_column("password_hash")
        batch.drop_column("email")

"""google profile photo, assistant prompts waiting for sign-in

Revision ID: 9e3c1f7a2b44
Revises: 5b7d2e9a4c10
Create Date: 2026-11-16 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '9e3c1f7a2b44'
down_revision: Union[str, Sequence[str], None] = '5b7d2e9a4c10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('avatar_url', sa.String(length=500), nullable=True))
    op.add_column('assistant_conversations', sa.Column('pending_prompt', sa.Text(), nullable=True))
    op.add_column('assistant_conversations', sa.Column('pending_prompt_at', sa.DateTime(timezone=True), nullable=True))
    # Guests no longer prove orders by phone in chat; order questions need an account.
    op.drop_column('assistant_conversations', 'verified_orders')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('assistant_conversations', sa.Column('verified_orders', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=False))
    op.drop_column('assistant_conversations', 'pending_prompt_at')
    op.drop_column('assistant_conversations', 'pending_prompt')
    op.drop_column('users', 'avatar_url')

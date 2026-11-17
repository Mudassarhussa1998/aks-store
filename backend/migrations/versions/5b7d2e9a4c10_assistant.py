"""shopping assistant: conversations, messages, memories

Revision ID: 5b7d2e9a4c10
Revises: 2c11b5ca8152
Create Date: 2026-11-16 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '5b7d2e9a4c10'
down_revision: Union[str, Sequence[str], None] = '2c11b5ca8152'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('assistant_conversations',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('turns', sa.Integer(), nullable=False),
    sa.Column('verified_orders', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('pending_action', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_assistant_conversations_user_updated', 'assistant_conversations', ['user_id', 'updated_at'], unique=False)
    op.create_table('assistant_messages',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('conversation_id', sa.String(length=64), nullable=False),
    sa.Column('role', sa.String(length=10), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['conversation_id'], ['assistant_conversations.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_assistant_messages_conversation_id'), 'assistant_messages', ['conversation_id'], unique=False)
    op.create_table('assistant_memories',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('fact', sa.String(length=300), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_assistant_memories_user_id'), 'assistant_memories', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_assistant_memories_user_id'), table_name='assistant_memories')
    op.drop_table('assistant_memories')
    op.drop_index(op.f('ix_assistant_messages_conversation_id'), table_name='assistant_messages')
    op.drop_table('assistant_messages')
    op.drop_index('ix_assistant_conversations_user_updated', table_name='assistant_conversations')
    op.drop_table('assistant_conversations')

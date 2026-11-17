"""Loading and saving assistant conversations and memories, with the ownership rule applied everywhere."""

import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AssistantConversation, AssistantMemory, AssistantMessage, User

# A signed-in customer picks up their latest chat on any device if it's this recent.
RESUME_WITHIN = timedelta(days=7)
# How long a guest's question waits for them to sign in.
PENDING_PROMPT_WITHIN = timedelta(minutes=30)


async def find(db: AsyncSession, conversation_id: str | None, user: User | None) -> AssistantConversation | None:
    """The conversation this caller may continue, or None.

    A conversation is only ever returned to its owner: the same signed-in user, or (for a guest conversation)
    a caller who is not signed in and holds its secret id. Signing in or out therefore switches chats, so an
    account's chat never shows to a guest. The one thing that crosses over is a guest's saved question, once
    (see claim_pending_prompt).
    """
    owner = user.id if user else None
    if conversation_id:
        convo = await db.get(AssistantConversation, conversation_id)
        if convo is not None and convo.user_id == owner:
            return convo
    if user is not None:
        return await db.scalar(
            select(AssistantConversation)
            .where(
                AssistantConversation.user_id == user.id,
                AssistantConversation.updated_at > datetime.now(UTC) - RESUME_WITHIN,
            )
            .order_by(AssistantConversation.updated_at.desc())
            .limit(1)
        )
    return None


async def find_or_create(db: AsyncSession, conversation_id: str | None, user: User | None) -> AssistantConversation:
    convo = await find(db, conversation_id, user)
    if convo is None:
        convo = AssistantConversation(id=secrets.token_urlsafe(32), user_id=user.id if user else None, turns=0)
        db.add(convo)
        await db.flush()
    return convo


async def history(db: AsyncSession, convo: AssistantConversation, limit: int) -> list[tuple[str, str]]:
    rows = (
        await db.scalars(
            select(AssistantMessage)
            .where(AssistantMessage.conversation_id == convo.id)
            .order_by(AssistantMessage.id.desc())
            .limit(limit)
        )
    ).all()
    return [(m.role, m.content) for m in reversed(rows)]


async def memories(db: AsyncSession, user: User | None) -> list[str]:
    if user is None:
        return []
    return list(
        (await db.scalars(select(AssistantMemory.fact).where(AssistantMemory.user_id == user.id).order_by(AssistantMemory.id))).all()
    )


async def claim_pending_prompt(db: AsyncSession, guest_conversation_id: str | None, user: User | None) -> str | None:
    """Hand a guest's saved question to the account they just signed in to, once.

    Only the caller holding that guest chat's secret id (the same browser) can claim it, only within
    PENDING_PROMPT_WITHIN, and the guest chat keeps nothing else that carries over.
    """
    if user is None or not guest_conversation_id:
        return None
    guest = await db.get(AssistantConversation, guest_conversation_id)
    if guest is None or guest.user_id is not None or not guest.pending_prompt or guest.pending_prompt_at is None:
        return None
    prompt = guest.pending_prompt
    fresh = guest.pending_prompt_at > datetime.now(UTC) - PENDING_PROMPT_WITHIN
    guest.pending_prompt, guest.pending_prompt_at = None, None
    await db.commit()
    return prompt if fresh else None

"""AI shopping assistant API. The storefront calls it server-side, forwarding the shopper's sign-in token."""

import logging
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request, status
from google.genai import errors as genai_errors
from sqlalchemy import delete, select

from app import schemas
from app.api.deps import DB, CurrentUser, OptionalUser
from app.assistant import agent, conversations
from app.assistant.context import ToolContext
from app.assistant.llm import AssistantUnavailable
from app.core.cache import bump, count
from app.core.config import settings
from app.models import AssistantMemory, AssistantMessage

log = logging.getLogger("velenzay.assistant")
router = APIRouter(prefix="/assistant", tags=["assistant"])

ConversationId = Annotated[str | None, Query(max_length=64)]


@router.post("/chat", response_model=schemas.AssistantReply)
async def chat(data: schemas.AssistantChatIn, db: DB, user: OptionalUser, request: Request, tasks: BackgroundTasks):
    if not settings.gemini_api_key:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "The assistant isn't switched on yet.")

    who = f"u{user.id}" if user else f"c{data.conversation_id}" if data.conversation_id else f"ip{request.client.host if request.client else ''}"
    limit_key = f"assistant-rate:{who}"
    if await count(limit_key) >= settings.assistant_messages_per_10_min:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "You're sending messages very fast. Please wait a few minutes.")
    await bump(limit_key, 600)

    convo = await conversations.find_or_create(db, data.conversation_id, user)
    message = data.message.strip()
    ctx = ToolContext(db=db, user=user, conversation=convo, turn=convo.turns + 1, message=message, cart=data.cart)
    history = await conversations.history(db, convo, settings.assistant_history_messages)
    memories = await conversations.memories(db, user)

    try:
        reply = await agent.run(ctx, history, message, memories)
    except AssistantUnavailable:
        await db.rollback()
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "The assistant isn't switched on yet.") from None
    except genai_errors.APIError as err:
        await db.rollback()
        log.warning("Gemini error: %s", err)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "The assistant is busy right now. Please try again in a moment.") from None
    except Exception:
        await db.rollback()
        raise

    convo.turns = ctx.turn
    db.add_all([
        AssistantMessage(conversation_id=convo.id, role="user", content=message),
        AssistantMessage(conversation_id=convo.id, role="assistant", content=reply),
    ])
    await db.commit()
    for job in ctx.after_response:
        tasks.add_task(job)
    return schemas.AssistantReply(conversation_id=convo.id, reply=reply, actions=ctx.actions)


@router.get("/conversation", response_model=schemas.AssistantConversationOut)
async def get_conversation(db: DB, user: OptionalUser, conversation_id: ConversationId = None):
    """The caller's current chat (to show it again after a reload or on another device).

    Right after a guest signs in, `resume_prompt` carries the question they asked before signing in, so the
    widget can send it again in their account's chat.
    """
    resume = await conversations.claim_pending_prompt(db, conversation_id, user)
    convo = await conversations.find(db, conversation_id, user)
    if convo is None:
        return schemas.AssistantConversationOut(conversation_id=None, signed_in=user is not None, messages=[], resume_prompt=resume)
    rows = (
        await db.scalars(select(AssistantMessage).where(AssistantMessage.conversation_id == convo.id).order_by(AssistantMessage.id.desc()).limit(60))
    ).all()
    return schemas.AssistantConversationOut(
        conversation_id=convo.id,
        signed_in=user is not None,
        messages=[schemas.AssistantMessageOut.model_validate(m) for m in reversed(rows)],
        resume_prompt=resume,
    )


@router.delete("/conversation", status_code=204)
async def delete_conversation(db: DB, user: OptionalUser, conversation_id: ConversationId = None):
    """Start over: deletes the caller's current chat (and anything verified or pending in it)."""
    convo = await conversations.find(db, conversation_id, user)
    if convo is not None:
        await db.delete(convo)
        await db.commit()


@router.get("/memories", response_model=list[schemas.AssistantMemoryOut])
async def list_memories(user: CurrentUser, db: DB):
    return (await db.scalars(select(AssistantMemory).where(AssistantMemory.user_id == user.id).order_by(AssistantMemory.id))).all()


@router.delete("/memories", status_code=204)
async def clear_memories(user: CurrentUser, db: DB):
    await db.execute(delete(AssistantMemory).where(AssistantMemory.user_id == user.id))
    await db.commit()

"""One-time 6-digit codes for email/phone verification and password reset."""

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import OneTimeCode, User

VERIFY_EMAIL, VERIFY_PHONE, RESET_PASSWORD = "verify_email", "verify_phone", "reset_password"


def _hash(user_id: int, purpose: str, code: str) -> str:
    return hmac.new(settings.jwt_secret.encode(), f"{user_id}:{purpose}:{code}".encode(), hashlib.sha256).hexdigest()


async def issue(db: AsyncSession, user: User, purpose: str, target: str) -> str:
    """Create a new code (retiring any older one) and return it. Raises 429 when asked for too often."""
    now = datetime.now(UTC)
    recent = (
        await db.scalars(
            select(OneTimeCode.created_at)
            .where(OneTimeCode.user_id == user.id, OneTimeCode.purpose == purpose, OneTimeCode.created_at > now - timedelta(hours=1))
            .order_by(OneTimeCode.created_at.desc())
        )
    ).all()
    if recent:
        wait = settings.otp_resend_seconds - int((now - recent[0]).total_seconds())
        if wait > 0:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS, f"Please wait {wait} seconds before asking for a new code.", headers={"Retry-After": str(wait)}
            )
    if len(recent) >= settings.otp_hourly_limit:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many codes requested. Please try again in an hour.")

    await db.execute(
        update(OneTimeCode).where(OneTimeCode.user_id == user.id, OneTimeCode.purpose == purpose, OneTimeCode.used_at.is_(None)).values(used_at=now)
    )
    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(
        OneTimeCode(
            user_id=user.id,
            purpose=purpose,
            target=target,
            code_hash=_hash(user.id, purpose, code),
            expires_at=now + timedelta(minutes=settings.otp_minutes),
            created_at=now,
        )
    )
    await db.commit()
    return code


async def consume(db: AsyncSession, user: User, purpose: str, code: str) -> OneTimeCode:
    """Check a code and mark it used. Raises 400 with a shopper-friendly message when it doesn't match."""
    row = await db.scalar(
        select(OneTimeCode)
        .where(OneTimeCode.user_id == user.id, OneTimeCode.purpose == purpose, OneTimeCode.used_at.is_(None), OneTimeCode.expires_at > func.now())
        .order_by(OneTimeCode.created_at.desc())
        .limit(1)
    )
    if row is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This code has expired. Please request a new one.")
    if row.attempts >= settings.otp_max_attempts:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Too many wrong tries. Please request a new code.")
    if not hmac.compare_digest(row.code_hash, _hash(user.id, purpose, code.strip())):
        row.attempts += 1
        await db.commit()
        left = settings.otp_max_attempts - row.attempts
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"That code isn't right. {left} {'try' if left == 1 else 'tries'} left." if left else "Too many wrong tries. Please request a new code.",
        )
    row.used_at = datetime.now(UTC)
    return row


def mask_email(email: str) -> str:
    name, _, domain = email.partition("@")
    return f"{name[:2]}{'•' * max(len(name) - 2, 1)}@{domain}"


def mask_phone(phone: str) -> str:
    return f"{phone[:6]}•••{phone[-4:]}"  # +92300•••4567

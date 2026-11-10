"""Create (or promote) the store admin without loading sample data.

    SEED_ADMIN_EMAIL=you@shop.pk SEED_ADMIN_PASSWORD=... uv run python create_admin.py
"""

import asyncio
import os
import sys

from sqlalchemy import func, select

from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models import User


async def main() -> None:
    email, password = os.getenv("SEED_ADMIN_EMAIL"), os.getenv("SEED_ADMIN_PASSWORD")
    if not email or not password or len(password) < 12:
        sys.exit("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (12+ characters).")
    async with SessionLocal() as db:
        user = await db.scalar(select(User).where(func.lower(User.email) == email.lower()))
        if user is None:
            user = User(name="Store Admin", email=email.lower(), password_hash=hash_password(password))
            db.add(user)
        else:
            user.password_hash = hash_password(password)
        user.is_admin = True
        await db.commit()
    print(f"Admin ready: {email}")


if __name__ == "__main__":
    asyncio.run(main())

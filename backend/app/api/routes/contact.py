from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from app import schemas
from app.api.deps import DB, OptionalUser
from app.core import cache
from app.core.config import settings
from app.models import ContactMessage
from app.services import notify

router = APIRouter(tags=["contact"])

TOPICS = {
    "order": "An order",
    "returns": "Returns & exchanges",
    "product": "A product question",
    "wholesale": "Wholesale or bulk order",
    "careers": "Careers",
    "other": "Something else",
}
LIMIT, WINDOW = 5, 60 * 60  # messages per email address per hour


@router.post("/contact", response_model=schemas.MessageOut, status_code=201)
async def contact(data: schemas.ContactIn, db: DB, user: OptionalUser, tasks: BackgroundTasks):
    reply = schemas.MessageOut(detail="Thank you! We've received your message and will reply within one working day.")
    if data.website:  # honeypot filled in: quietly accept and drop it
        return reply
    key = f"contact:{data.email.lower()}"
    if await cache.count(key) >= LIMIT:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "You've sent several messages already. We'll be in touch soon.")
    await cache.bump(key, WINDOW)

    msg = ContactMessage(
        user_id=user.id if user else None,
        topic=data.topic,
        name=data.name.strip(),
        email=data.email.lower(),
        phone=data.phone,
        order_number=(data.order_number or "").upper() or None,
        message=data.message.strip(),
    )
    db.add(msg)
    await db.commit()

    subject = TOPICS[data.topic]
    details = "\n".join(
        line
        for line in (
            f"From: {msg.name} <{msg.email}>",
            f"Phone: {msg.phone}" if msg.phone else None,
            f"Order: {msg.order_number}" if msg.order_number else None,
            "",
            msg.message,
            "",
            f"Reply in the admin inbox: {settings.site_url}/admin/messages",
        )
        if line is not None
    )
    if settings.store_email:
        tasks.add_task(notify.send_email, settings.store_email, f"New message: {subject} — {msg.name}", details)
    tasks.add_task(
        notify.send_email,
        msg.email,
        "We've received your message · Velenzay",
        f"Hi {msg.name.split()[0]},\n\nThanks for getting in touch about \"{subject.lower()}\". "
        "Our team replies within one working day (Monday to Saturday).\n\nYour message:\n" + msg.message + "\n\n— Velenzay",
    )
    return reply

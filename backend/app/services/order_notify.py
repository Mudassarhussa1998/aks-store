"""Customer messages when an order is placed or changes status.

Routes take a `snapshot()` of the order while the database session is open and hand it to `send()` as a
background task, so a slow email/SMS provider never delays the response.
"""

from html import escape

from app.core.config import settings
from app.models import Order
from app.schemas import normalize_pk_phone
from app.services import notify


def snapshot(order: Order, event: str) -> dict:
    return {
        "event": event,
        "number": order.number,
        "name": order.name.split()[0] if order.name else "",
        "email": order.email,
        "phone": order.phone,
        "total": order.total,
        "courier": order.courier,
        "tracking": order.tracking_number,
        "items": [f"{i.product_name} ({i.variant_label}) × {i.quantity}" for i in order.items],
    }


def _rs(amount: int) -> str:
    return f"Rs {amount:,}"


def _message(o: dict) -> tuple[str, list[str], str]:
    """Subject, body lines, and a short SMS for each event."""
    n, total, link = o["number"], _rs(o["total"]), f"{settings.site_url}/track"
    ship = f" with {o['courier']}" if o["courier"] else ""
    tracking = f" Tracking number: {o['tracking']}." if o["tracking"] else ""
    return {
        "placed": (
            f"Order #{n} received",
            [f"Thank you, {o['name']}! We've received your order #{n}.", f"Total {total}, to pay in cash on delivery.", "We'll call you shortly to confirm it."],
            f"Aks.pk: Order #{n} received ({total}, Cash on Delivery). We'll call to confirm. Track: {link}",
        ),
        "confirmed": (
            f"Order #{n} confirmed",
            [f"Good news, {o['name']}: order #{n} is confirmed and being packed.", "We'll let you know when it ships."],
            f"Aks.pk: Order #{n} is confirmed and being packed.",
        ),
        "shipped": (
            f"Order #{n} is on its way",
            [f"Your order #{n} has shipped{ship}.{tracking}", f"Please keep {total} ready for the rider."],
            f"Aks.pk: Order #{n} shipped{ship}.{tracking} Keep {total} ready. Track: {link}",
        ),
        "delivered": (
            f"Order #{n} delivered",
            [f"Your order #{n} has been delivered. We hope you love it!", "If you have a minute, rate your items from My Account → My orders."],
            f"Aks.pk: Order #{n} delivered. Thank you for shopping with us!",
        ),
        "cancelled": (
            f"Order #{n} cancelled",
            [f"Your order #{n} has been cancelled.", "If this wasn't expected, just reply to this email or message us on WhatsApp."],
            f"Aks.pk: Order #{n} has been cancelled.",
        ),
        "returned": (
            f"Return received for order #{n}",
            [f"We've received the return for order #{n}. Thank you for letting us know."],
            f"Aks.pk: Return received for order #{n}.",
        ),
    }[o["event"]]


async def send(o: dict) -> None:
    subject, lines, sms = _message(o)
    if o["email"]:
        items = "".join(f"<li>{escape(i)}</li>" for i in o["items"])
        paragraphs = "".join(f'<p style="font-size:16px;margin:0 0 12px">{escape(line)}</p>' for line in lines)
        html = f"""<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1d1d1f">
  <p style="font-size:20px;font-weight:600;letter-spacing:.08em;margin:0 0 24px">AKS<span style="font-size:12px;color:#5f5f5f;letter-spacing:0">.pk</span></p>
  {paragraphs}
  <ul style="font-size:14px;color:#4a4a4a;padding-left:18px;margin:16px 0">{items}</ul>
  <p style="margin:24px 0 0"><a href="{settings.site_url}/track" style="background:#1E3A34;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-size:15px">Track your order</a></p>
</div>"""
        text = "\n".join([*lines, "", *o["items"], "", f"Track your order: {settings.site_url}/track"])
        await notify.send_email(o["email"], f"{subject} · Aks.pk", text, html)
    if o["event"] in settings.sms_order_events:
        try:
            phone = normalize_pk_phone(o["phone"])
        except ValueError:
            return
        await notify.send_sms(phone, sms)

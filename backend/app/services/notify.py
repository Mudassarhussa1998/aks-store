"""Email and SMS delivery. Providers are picked in settings; "console" just logs the message (development).

Senders never raise: a failed delivery is logged and the shopper can ask for the code again.
"""

import logging
from collections import deque

import httpx

from app.core.config import settings

log = logging.getLogger("velenzay.notify")

# Messages sent by the console providers, newest last. Lets tests (and local debugging) read codes.
outbox: deque[dict] = deque(maxlen=50)


async def send_email(to: str, subject: str, text: str, html: str | None = None) -> None:
    try:
        if settings.email_provider == "resend" and settings.resend_api_key:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                    json={"from": settings.email_from, "to": [to], "subject": subject, "text": text, "html": html or text},
                )
                r.raise_for_status()
        else:
            outbox.append({"channel": "email", "to": to, "subject": subject, "text": text})
            log.warning("EMAIL to %s | %s | %s", to, subject, text)
    except Exception as exc:  # noqa: BLE001
        log.error("email to %s failed: %s", to, exc)


async def _send_http_sms(to: str, text: str) -> None:
    """Any bulk-SMS gateway with a link like https://gateway.pk/send?key=XXX&to={to}&msg={text}."""
    url = httpx.URL(settings.sms_http_url or "")
    params = {k: v.replace("{to}", to.lstrip("+")).replace("{text}", text) for k, v in url.params.multi_items()}
    async with httpx.AsyncClient(timeout=10) as client:
        if settings.sms_http_method.upper() == "POST":
            r = await client.post(url.copy_with(query=None), data=params)
        else:
            r = await client.get(url.copy_with(query=None), params=params)
    if r.is_error:  # the link holds the gateway's key, so never log it
        raise RuntimeError(f"gateway replied {r.status_code}: {r.text[:200]}")


async def send_sms(to: str, text: str) -> None:
    if settings.sms_provider == "off":
        return
    try:
        if settings.sms_provider == "http" and settings.sms_http_url:
            await _send_http_sms(to, text)
        elif settings.sms_provider == "twilio" and settings.twilio_account_sid and settings.twilio_auth_token:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(
                    f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json",
                    auth=(settings.twilio_account_sid, settings.twilio_auth_token),
                    data={"To": to, "From": settings.twilio_from or "", "Body": text},
                )
                r.raise_for_status()
        else:
            outbox.append({"channel": "sms", "to": to, "text": text})
            log.warning("SMS to %s | %s", to, text)
    except Exception as exc:  # noqa: BLE001
        log.error("sms to %s failed: %s", to, type(exc).__name__ if isinstance(exc, httpx.HTTPError) else exc)


def code_email(code: str, purpose: str) -> tuple[str, str, str]:
    """Subject, plain text and HTML for an email carrying a one-time code."""
    action = "reset your password" if purpose == "reset_password" else "verify your email"
    subject = f"{code} is your Velenzay code"
    text = (
        f"Your Velenzay code is {code}. Use it to {action}.\n\n"
        f"It expires in {settings.otp_minutes} minutes. If you didn't ask for this, you can ignore this email."
    )
    html = f"""<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1d1d1f">
  <p style="margin:0 0 24px"><img src="{settings.site_url}/brand/logo-email.png" width="240" height="56" alt="Velenzay" style="display:block;border:0"></p>
  <p style="font-size:16px;margin:0 0 16px">Use this code to {action}:</p>
  <p style="font-size:34px;font-weight:600;letter-spacing:.3em;margin:0 0 16px">{code}</p>
  <p style="font-size:14px;color:#5f5f5f;margin:0">It expires in {settings.otp_minutes} minutes. If you didn't ask for this, you can ignore this email.</p>
</div>"""
    return subject, text, html


def code_sms(code: str, purpose: str) -> str:
    action = "reset your password" if purpose == "reset_password" else "verify your phone"
    return f"{code} is your Velenzay code to {action}. It expires in {settings.otp_minutes} minutes. Don't share it with anyone."

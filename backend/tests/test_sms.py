import httpx

from app.core.config import settings
from app.services import notify


async def test_http_gateway_fills_number_and_message(monkeypatch):
    seen = []
    real_client = httpx.AsyncClient
    transport = httpx.MockTransport(lambda req: seen.append(req) or httpx.Response(200, text="OK"))
    monkeypatch.setattr(notify.httpx, "AsyncClient", lambda **kw: real_client(transport=transport, **kw))
    monkeypatch.setattr(settings, "sms_provider", "http")
    monkeypatch.setattr(settings, "sms_http_url", "https://gw.example.pk/send?key=abc&to={to}&msg={text}&mask=Velenzay")

    await notify.send_sms("+923001234567", "123456 is your code & more")

    (req,) = seen
    assert req.url.host == "gw.example.pk" and req.method == "GET"
    assert dict(req.url.params) == {"key": "abc", "to": "923001234567", "msg": "123456 is your code & more", "mask": "Velenzay"}


async def test_sms_off_hides_phone_verification(client, monkeypatch):
    monkeypatch.setattr(settings, "sms_provider", "off")
    r = await client.post("/api/v1/auth/register", json={"name": "Sara", "email": "sara@example.com", "phone": "03001234567", "password": "a-long-password"})
    token = r.json()["access_token"]
    assert r.json()["user"]["can_verify_phone"] is False
    r = await client.post("/api/v1/auth/verify/send", json={"channel": "phone"}, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 400
    # Forgot password by phone sends the code to the account's email instead.
    notify.outbox.clear()
    await client.post("/api/v1/auth/password/forgot", json={"identifier": "0300 1234567"})
    assert [m["channel"] for m in notify.outbox] == ["email"]

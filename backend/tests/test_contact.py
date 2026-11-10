import pytest

from app.core.config import settings
from app.services import notify

API = "/api/v1"
MESSAGE = {"topic": "order", "name": "Nida Iqbal", "email": "Nida@Example.com", "phone": "0300-7654321", "order_number": "rwj-abc123", "message": "My parcel hasn't arrived yet, can you check?"}


@pytest.fixture(autouse=True)
def clear_outbox(monkeypatch):
    notify.outbox.clear()
    monkeypatch.setattr(settings, "store_email", "hello@rawaj.pk")


async def test_contact_message_saved_emailed_and_in_admin_inbox(client, admin):
    r = await client.post(f"{API}/contact", json=MESSAGE)
    assert r.status_code == 201 and "received your message" in r.json()["detail"]

    to = {m["to"]: m for m in notify.outbox}
    assert "RWJ-ABC123" in to["hello@rawaj.pk"]["text"] and "+923007654321" in to["hello@rawaj.pk"]["text"]
    assert "We've received your message" in to["nida@example.com"]["subject"]

    inbox = (await client.get(f"{API}/admin/messages", headers=admin, params={"unread": True})).json()
    assert len(inbox) == 1 and inbox[0]["topic"] == "order" and inbox[0]["is_read"] is False
    assert (await client.get(f"{API}/admin/stats", headers=admin)).json()["unread_messages"] == 1

    assert (await client.patch(f"{API}/admin/messages/{inbox[0]['id']}", headers=admin)).status_code == 204
    assert (await client.get(f"{API}/admin/messages", headers=admin, params={"unread": True})).json() == []


async def test_contact_validation_and_spam(client, admin, customer):
    r = await client.post(f"{API}/contact", json={**MESSAGE, "message": "hi"})
    assert r.status_code == 422
    r = await client.post(f"{API}/contact", json={**MESSAGE, "phone": "12345"})
    assert r.status_code == 422
    # A bot filling the hidden field gets the same polite reply but nothing is stored or sent.
    r = await client.post(f"{API}/contact", json={**MESSAGE, "website": "http://spam.example"})
    assert r.status_code == 201 and not [m for m in notify.outbox if m["to"] in ("hello@rawaj.pk", "nida@example.com")]
    assert (await client.get(f"{API}/admin/messages", headers=admin)).json() == []
    assert (await client.get(f"{API}/admin/messages", headers=customer)).status_code == 403

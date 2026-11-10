import pytest

from app.services import notify
from tests.test_store import ADDRESS, stock, variant_id

API = "/api/v1"


@pytest.fixture(autouse=True)
def clear_outbox():
    notify.outbox.clear()


async def _order(client, headers=None, email="ayesha@test.pk", qty=2) -> dict:
    vid = await variant_id("B-S-IV-S")  # stock 5
    r = await client.post(f"{API}/orders", headers=headers, json={**ADDRESS, "email": email, "items": [{"variant_id": vid, "quantity": qty}]})
    assert r.status_code == 201, r.text
    return r.json()


async def test_order_messages_follow_status(client, admin):
    order = await _order(client)
    n = order["number"]
    assert order["items"][0]["variant_id"] == await variant_id("B-S-IV-S")  # lets "Buy again" refill the cart
    placed = [m for m in notify.outbox if n in (m.get("subject", "") + m["text"])]
    assert {m["channel"] for m in placed} == {"email", "sms"}
    assert next(m for m in placed if m["channel"] == "sms")["to"] == "+923001234567"

    notify.outbox.clear()
    await client.patch(f"{API}/admin/orders/{n}", headers=admin, json={"status": "confirmed"})
    assert [m["channel"] for m in notify.outbox] == ["email"]  # no paid SMS for "confirmed"

    notify.outbox.clear()
    await client.patch(f"{API}/admin/orders/{n}", headers=admin, json={"status": "shipped", "courier": "TCS", "tracking_number": "TCS123"})
    sms = next(m for m in notify.outbox if m["channel"] == "sms")
    assert "TCS" in sms["text"] and "TCS123" in sms["text"]


async def test_customer_can_cancel_until_shipped(client, customer, admin):
    order = await _order(client, headers=customer)
    assert await stock("B-S-IV-S") == 3

    # Someone else (no account, wrong phone) can't cancel it.
    r = await client.post(f"{API}/orders/{order['number']}/cancel", json={"phone": "03119999999"})
    assert r.status_code == 404

    r = await client.post(f"{API}/orders/{order['number']}/cancel", headers=customer, json={"reason": "Ordered the wrong size"})
    assert r.status_code == 200 and r.json()["status"] == "cancelled"
    assert r.json()["events"][-1]["note"] == "Cancelled by customer: Ordered the wrong size"
    assert await stock("B-S-IV-S") == 5
    assert any(m["channel"] == "email" and "cancelled" in m["subject"] for m in notify.outbox)

    shipped = await _order(client, headers=customer)
    for s in ("confirmed", "shipped"):
        await client.patch(f"{API}/admin/orders/{shipped['number']}", headers=admin, json={"status": s})
    r = await client.post(f"{API}/orders/{shipped['number']}/cancel", headers=customer, json={})
    assert r.status_code == 400 and "already shipped" in r.json()["detail"]


async def test_guest_cancels_with_checkout_phone(client):
    order = await _order(client, email=None)
    r = await client.post(f"{API}/orders/{order['number'].lower()}/cancel", json={"phone": "+92 300 1234567"})
    assert r.status_code == 200 and r.json()["status"] == "cancelled"


async def test_edit_and_delete_own_review(client, customer, admin):
    r = await client.post(f"{API}/products/bath-towel/reviews", headers=customer, json={"rating": 2, "title": "Thin", "body": "Thinner than expected."})
    review = r.json()
    r = await client.put(f"{API}/me/reviews/{review['id']}", headers=customer, json={"rating": 5, "title": "Grew on me", "body": "Softer after a wash."})
    assert r.status_code == 200 and r.json()["rating"] == 5
    assert (await client.get(f"{API}/products/bath-towel")).json()["rating_avg"] == 5

    # Not someone else's.
    r = await client.put(f"{API}/me/reviews/{review['id']}", headers=admin, json={"rating": 1, "title": "Nope", "body": "Not mine to edit."})
    assert r.status_code == 404

    assert (await client.delete(f"{API}/me/reviews/{review['id']}", headers=customer)).status_code == 204
    product = (await client.get(f"{API}/products/bath-towel")).json()
    assert product["rating_count"] == 0


async def test_delete_account_keeps_orders_but_unlinks_them(client, customer, admin):
    order = await _order(client, headers=customer)
    await client.post(f"{API}/products/bath-towel/reviews", headers=customer, json={"rating": 4, "title": "Nice", "body": "Good towel overall."})

    r = await client.post(f"{API}/auth/delete-account", headers=customer, json={"password": "wrong-password"})
    assert r.status_code == 400
    r = await client.post(f"{API}/auth/delete-account", headers=customer, json={"password": "secret-pass-1"})
    assert r.status_code == 204

    assert (await client.get(f"{API}/auth/me", headers=customer)).status_code == 401
    r = await client.post(f"{API}/auth/login", json={"identifier": "ayesha@test.pk", "password": "secret-pass-1"})
    assert r.status_code == 401
    assert (await client.get(f"{API}/products/bath-towel")).json()["rating_count"] == 0
    assert (await client.get(f"{API}/admin/orders/{order['number']}", headers=admin)).status_code == 200  # order kept

    r = await client.post(f"{API}/auth/delete-account", headers=admin, json={"password": "admin-pass-123"})
    assert r.status_code == 400

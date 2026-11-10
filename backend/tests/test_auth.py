import re

import pytest

from app.services import notify

API = "/api/v1/auth"


@pytest.fixture(autouse=True)
def clear_outbox():
    notify.outbox.clear()


def last_code(channel: str, to: str) -> str:
    msg = next(m for m in reversed(notify.outbox) if m["channel"] == channel and m["to"] == to)
    return re.search(r"\b(\d{6})\b", msg["text"]).group(1)


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_register_sends_email_code_and_verifies(client, customer):
    me = (await client.get(f"{API}/me", headers=customer)).json()
    assert me["phone"] == "+923001234567" and me["email_verified"] is False and me["phone_verified"] is False

    code = last_code("email", "ayesha@test.pk")
    wrong = "000000" if code != "000000" else "111111"
    r = await client.post(f"{API}/verify/confirm", headers=customer, json={"channel": "email", "code": wrong})
    assert r.status_code == 400 and "4 tries left" in r.json()["detail"]

    r = await client.post(f"{API}/verify/confirm", headers=customer, json={"channel": "email", "code": code})
    assert r.status_code == 200 and r.json()["email_verified"] is True

    # The same code can't be used twice, and a verified email can't ask for another.
    r = await client.post(f"{API}/verify/confirm", headers=customer, json={"channel": "email", "code": code})
    assert r.status_code == 400
    r = await client.post(f"{API}/verify/send", headers=customer, json={"channel": "email"})
    assert r.status_code == 400


async def test_resend_cooldown_and_lockout(client, customer):
    r = await client.post(f"{API}/verify/send", headers=customer, json={"channel": "email"})
    assert r.status_code == 429 and "Retry-After" in r.headers  # sign-up just sent one

    r = await client.post(f"{API}/verify/send", headers=customer, json={"channel": "phone"})
    assert r.status_code == 200 and r.json()["sent_to"] == "+92300•••4567"
    code = last_code("sms", "+923001234567")
    wrong = "000000" if code != "000000" else "111111"
    for _ in range(5):
        await client.post(f"{API}/verify/confirm", headers=customer, json={"channel": "phone", "code": wrong})
    r = await client.post(f"{API}/verify/confirm", headers=customer, json={"channel": "phone", "code": code})
    assert r.status_code == 400 and "request a new code" in r.json()["detail"]


async def test_phone_verification_and_login_by_phone(client, customer):
    await client.post(f"{API}/verify/send", headers=customer, json={"channel": "phone"})
    r = await client.post(f"{API}/verify/confirm", headers=customer, json={"channel": "phone", "code": last_code("sms", "+923001234567")})
    assert r.json()["phone_verified"] is True

    r = await client.post(f"{API}/login", json={"identifier": "0300-1234567", "password": "secret-pass-1"})
    assert r.status_code == 200 and r.json()["user"]["email"] == "ayesha@test.pk"
    r = await client.post(f"{API}/login", json={"identifier": "+92 300 1234567", "password": "wrong-password"})
    assert r.status_code == 401


async def test_register_rejects_taken_phone_and_bad_numbers(client, customer):
    r = await client.post(f"{API}/register", json={"name": "Other", "email": "other@test.pk", "phone": "+923001234567", "password": "secret-pass-1"})
    assert r.status_code == 409 and "mobile number" in r.json()["detail"]
    r = await client.post(f"{API}/register", json={"name": "Other", "email": "other@test.pk", "phone": "0423 1234567", "password": "secret-pass-1"})
    assert r.status_code == 422


async def test_forgot_and_reset_password_by_email(client, customer):
    r = await client.post(f"{API}/password/forgot", json={"identifier": "nobody@test.pk"})
    assert r.status_code == 202 and not [m for m in notify.outbox if m["to"] == "nobody@test.pk"]

    r = await client.post(f"{API}/password/forgot", json={"identifier": "Ayesha@test.pk"})
    assert r.status_code == 202
    code = last_code("email", "ayesha@test.pk")

    r = await client.post(f"{API}/password/reset", json={"identifier": "ayesha@test.pk", "code": code, "password": "brand-new-pass"})
    assert r.status_code == 200
    assert r.json()["user"]["email_verified"] is True  # receiving the code proves the inbox

    assert (await client.get(f"{API}/me", headers=customer)).status_code == 401  # old sessions are signed out
    assert (await client.get(f"{API}/me", headers=bearer(r.json()["access_token"]))).status_code == 200
    r = await client.post(f"{API}/login", json={"identifier": "ayesha@test.pk", "password": "brand-new-pass"})
    assert r.status_code == 200


async def test_reset_by_phone_needs_verified_phone(client, customer):
    await client.post(f"{API}/password/forgot", json={"identifier": "03001234567"})
    assert not [m for m in notify.outbox if m["channel"] == "sms"]


async def test_change_password_signs_out_other_sessions(client, customer):
    r = await client.post(f"{API}/password/change", headers=customer, json={"current_password": "nope-nope", "new_password": "another-pass-1"})
    assert r.status_code == 400
    r = await client.post(f"{API}/password/change", headers=customer, json={"current_password": "secret-pass-1", "new_password": "another-pass-1"})
    assert r.status_code == 200
    assert (await client.get(f"{API}/me", headers=customer)).status_code == 401
    assert (await client.get(f"{API}/me", headers=bearer(r.json()["access_token"]))).status_code == 200


async def test_profile_update(client, customer, admin):
    await client.post(f"{API}/verify/send", headers=customer, json={"channel": "phone"})
    await client.post(f"{API}/verify/confirm", headers=customer, json={"channel": "phone", "code": last_code("sms", "+923001234567")})

    r = await client.patch(f"{API}/me", headers=customer, json={"gender": "female", "date_of_birth": "1995-04-12", "city": " Lahore "})
    assert r.status_code == 200 and r.json()["city"] == "Lahore" and r.json()["phone_verified"] is True

    r = await client.patch(f"{API}/me", headers=customer, json={"phone": "0321 7654321"})
    assert r.json()["phone"] == "+923217654321" and r.json()["phone_verified"] is False

    r = await client.patch(f"{API}/me", headers=admin, json={"phone": "03217654321"})
    assert r.status_code == 409
    r = await client.patch(f"{API}/me", headers=customer, json={"email": "admin@test.pk"})
    assert r.status_code == 409
    r = await client.patch(f"{API}/me", headers=customer, json={"date_of_birth": "2999-01-01"})
    assert r.status_code == 422

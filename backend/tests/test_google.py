"""Google sign-in. Tokens are signed with a throwaway RSA key standing in for Google's, so the real checks run
(signature, audience, issuer, expiry, nonce)."""

import time
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.core.config import settings
from app.services import google

API = "/api/v1/auth"
CLIENT_ID = "test-client.apps.googleusercontent.com"
NONCE = "n" * 32
KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture(autouse=True)
def fake_google(monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", CLIENT_ID)
    monkeypatch.setattr(google._jwks, "get_signing_key_from_jwt", lambda token: SimpleNamespace(key=KEY.public_key()))


def id_token(sub="g-123", email="zara@gmail.com", **over) -> str:
    claims = {
        "iss": "https://accounts.google.com",
        "aud": CLIENT_ID,
        "sub": sub,
        "email": email,
        "email_verified": True,
        "name": "Zara Sheikh",
        "nonce": NONCE,
        "iat": int(time.time()),
        "exp": int(time.time()) + 600,
        **over,
    }
    return jwt.encode(claims, KEY, algorithm="RS256")


async def sign_in(client, token, nonce=NONCE):
    return await client.post(f"{API}/oauth/google", json={"id_token": token, "nonce": nonce})


async def test_new_google_user_needs_phone_and_has_no_password(client):
    r = await sign_in(client, id_token())
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["is_new"] is True and body["needs_phone"] is True
    assert body["user"]["email_verified"] is True and body["user"]["has_password"] is False
    assert body["user"]["name"] == "Zara Sheikh"
    headers = {"Authorization": f"Bearer {body['access_token']}"}

    # Same Google account again → same user, not a new one.
    again = (await sign_in(client, id_token())).json()
    assert again["is_new"] is False and again["user"]["id"] == body["user"]["id"]

    # Adding the phone finishes the profile.
    await client.patch(f"{API}/me", headers=headers, json={"phone": "0321 5550001"})
    assert (await sign_in(client, id_token())).json()["needs_phone"] is False

    # Password sign-in can't be used until they set one, which needs no current password.
    r = await client.post(f"{API}/login", json={"identifier": "zara@gmail.com", "password": "anything-at-all"})
    assert r.status_code == 401
    r = await client.post(f"{API}/password/change", headers=headers, json={"new_password": "zara-new-pass-1"})
    assert r.status_code == 200 and r.json()["user"]["has_password"] is True
    r = await client.post(f"{API}/login", json={"identifier": "zara@gmail.com", "password": "zara-new-pass-1"})
    assert r.status_code == 200


async def test_links_to_existing_account_by_email(client, customer):
    # The customer fixture registered ayesha@test.pk with a password but hasn't verified the email.
    r = await sign_in(client, id_token(sub="g-ayesha", email="Ayesha@test.pk"))
    body = r.json()
    assert body["is_new"] is False and body["needs_phone"] is False and body["user"]["email_verified"] is True
    # The unverified-era password is removed and its sessions end: it might not have been set by the inbox owner.
    assert body["user"]["has_password"] is False
    assert (await client.get(f"{API}/me", headers=customer)).status_code == 401


async def test_verified_account_keeps_its_password_when_linking(client, customer):
    from app.services import notify

    code = next(m for m in reversed(notify.outbox) if m["to"] == "ayesha@test.pk")["text"].split()[4].rstrip(".")
    await client.post(f"{API}/verify/confirm", headers=customer, json={"channel": "email", "code": code})
    body = (await sign_in(client, id_token(sub="g-ayesha", email="ayesha@test.pk"))).json()
    assert body["user"]["has_password"] is True
    assert (await client.get(f"{API}/me", headers=customer)).status_code == 200


async def test_rejects_bad_tokens(client):
    assert (await sign_in(client, id_token(), nonce="x" * 32)).status_code == 401  # replayed into another sign-in
    assert (await sign_in(client, id_token(aud="someone-elses-app"))).status_code == 401
    assert (await sign_in(client, id_token(iss="https://evil.example"))).status_code == 401
    assert (await sign_in(client, id_token(exp=int(time.time()) - 60))).status_code == 401
    r = await sign_in(client, id_token(email_verified=False))
    assert r.status_code == 401 and "isn't verified" in r.json()["detail"]
    other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    forged = jwt.encode(jwt.decode(id_token(), options={"verify_signature": False}), other_key, algorithm="RS256")
    assert (await sign_in(client, forged)).status_code == 401


async def test_admins_must_use_password(client):
    r = await sign_in(client, id_token(sub="g-admin", email="admin@test.pk"))
    assert r.status_code == 403


async def test_google_only_user_can_delete_account_without_password(client):
    body = (await sign_in(client, id_token())).json()
    headers = {"Authorization": f"Bearer {body['access_token']}"}
    r = await client.post(f"{API}/delete-account", headers=headers, json={})
    assert r.status_code == 204
    assert (await sign_in(client, id_token())).json()["is_new"] is True  # the link went with the account

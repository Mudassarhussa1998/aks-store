"""Facebook sign-in, with Facebook's Graph API replaced by a fake that also checks what we send it."""

import hashlib
import hmac

import httpx
import pytest

from app.core.config import settings
from app.services import facebook

API = "/api/v1/auth"
APP_ID, SECRET = "1234567890", "fb-test-secret"
PEOPLE = {
    "good-code-1": {"id": "fb-1", "name": "Bilal Ahmed", "email": "bilal@example.com"},
    "no-email-code": {"id": "fb-2", "name": "Phone Only"},
}


@pytest.fixture(autouse=True)
def fake_facebook(monkeypatch):
    monkeypatch.setattr(settings, "facebook_app_id", APP_ID)
    monkeypatch.setattr(settings, "facebook_app_secret", SECRET)
    issued: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        q = request.url.params
        if request.url.path.endswith("/oauth/access_token"):
            assert q["client_id"] == APP_ID and q["client_secret"] == SECRET
            assert q["redirect_uri"] == f"{settings.site_url}/auth/facebook/callback"
            if q["code"] not in PEOPLE:
                return httpx.Response(400, json={"error": {"message": "Invalid verification code"}})
            token = f"token-for-{q['code']}"
            issued[token] = q["code"]
            return httpx.Response(200, json={"access_token": token, "token_type": "bearer"})
        if request.url.path.endswith("/me"):
            expected = hmac.new(SECRET.encode(), q["access_token"].encode(), hashlib.sha256).hexdigest()
            assert q["appsecret_proof"] == expected
            return httpx.Response(200, json=PEOPLE[issued[q["access_token"]]])
        return httpx.Response(404)

    monkeypatch.setattr(facebook, "_client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler)))


async def sign_in(client, code):
    return await client.post(f"{API}/oauth/facebook", json={"code": code})


async def test_new_facebook_user(client):
    r = await sign_in(client, "good-code-1")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["is_new"] is True and body["needs_phone"] is True
    assert body["user"]["name"] == "Bilal Ahmed" and body["user"]["email_verified"] is True and body["user"]["has_password"] is False
    again = (await sign_in(client, "good-code-1")).json()
    assert again["is_new"] is False and again["user"]["id"] == body["user"]["id"]


async def test_facebook_and_google_share_one_account_by_email(client, customer):
    # The customer fixture's email is ayesha@test.pk; a Facebook account with that email joins the same account.
    PEOPLE["ayesha-code"] = {"id": "fb-ayesha", "name": "Ayesha K", "email": "ayesha@test.pk"}
    body = (await sign_in(client, "ayesha-code")).json()
    assert body["is_new"] is False and body["needs_phone"] is False


async def test_bad_code_and_missing_email(client):
    assert (await sign_in(client, "made-up-code")).status_code == 401
    r = await sign_in(client, "no-email-code")
    assert r.status_code == 400 and "didn't share an email" in r.json()["detail"]


async def test_not_configured(client, monkeypatch):
    monkeypatch.setattr(settings, "facebook_app_secret", None)
    assert (await sign_in(client, "good-code-1")).status_code == 503

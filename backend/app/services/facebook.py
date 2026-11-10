"""Facebook Login. Facebook gives websites a one-time code rather than a signed token, so the API swaps the
code for an access token itself (with the app secret, which never reaches the browser) and reads the profile."""

import hashlib
import hmac

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

GRAPH = "https://graph.facebook.com/v21.0"


def redirect_uri() -> str:
    """Must match the address the storefront sent the shopper to Facebook with."""
    return f"{settings.site_url.rstrip('/')}/auth/facebook/callback"


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=10)


def _failed() -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, "Facebook sign-in failed. Please try again.")


async def profile_from_code(code: str) -> dict:
    """Returns {id, name, email} for the person who just approved the login, or raises."""
    if not (settings.facebook_app_id and settings.facebook_app_secret):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Facebook sign-in isn't set up yet.")
    async with _client() as client:
        try:
            r = await client.get(
                f"{GRAPH}/oauth/access_token",
                params={
                    "client_id": settings.facebook_app_id,
                    "client_secret": settings.facebook_app_secret,
                    "redirect_uri": redirect_uri(),
                    "code": code,
                },
            )
            if r.status_code != 200 or "access_token" not in r.json():
                raise _failed()
            token = r.json()["access_token"]
            # appsecret_proof ties the call to our app, so a token stolen from elsewhere can't be used with it.
            proof = hmac.new(settings.facebook_app_secret.encode(), token.encode(), hashlib.sha256).hexdigest()
            r = await client.get(f"{GRAPH}/me", params={"fields": "id,name,email", "access_token": token, "appsecret_proof": proof})
        except httpx.HTTPError as exc:
            raise _failed() from exc
    if r.status_code != 200 or not r.json().get("id"):
        raise _failed()
    profile = r.json()
    if not profile.get("email"):
        # Facebook only shares confirmed emails; some accounts (signed up by phone) have none to share.
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Your Facebook account didn't share an email address. Please sign up with your email or Google instead.",
        )
    return profile

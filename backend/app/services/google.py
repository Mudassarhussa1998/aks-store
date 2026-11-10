"""Verify Google ID tokens ("Continue with Google").

The web app runs the OAuth redirect and code exchange, then hands us the ID token. We check its signature
against Google's published keys, the audience (our client id), the issuer, the expiry and the nonce the web
app created for this sign-in, so a token can't be forged, reused from another app or replayed.
"""

import asyncio

import jwt
from fastapi import HTTPException, status

from app.core.config import settings

_jwks = jwt.PyJWKClient("https://www.googleapis.com/oauth2/v3/certs", cache_keys=True, lifespan=3600)
ISSUERS = ("https://accounts.google.com", "accounts.google.com")


def _decode(token: str) -> dict:
    key = _jwks.get_signing_key_from_jwt(token)
    return jwt.decode(token, key.key, algorithms=["RS256"], audience=settings.google_client_id, issuer=ISSUERS)


async def verify_id_token(token: str, nonce: str) -> dict:
    """Returns the token's claims (sub, email, name…) or raises 401."""
    if not settings.google_client_id:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Google sign-in isn't set up yet.")
    try:
        claims = await asyncio.to_thread(_decode, token)  # key fetch is blocking network I/O
    except (jwt.PyJWTError, OSError) as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google sign-in failed. Please try again.") from exc
    if claims.get("nonce") != nonce or not claims.get("sub") or not claims.get("email"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google sign-in failed. Please try again.")
    if not claims.get("email_verified"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your Google email isn't verified yet. Please verify it with Google first.")
    return claims

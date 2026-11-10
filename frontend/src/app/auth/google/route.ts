import { createHash, randomBytes } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI, googleEnabled, type GooglePending } from "@/lib/google";
import { pendingCookie, safeNext } from "@/lib/oauth";

const random = () => randomBytes(32).toString("base64url");

/** Step 1: send the shopper to Google's account chooser. */
export function GET(request: NextRequest) {
  if (!googleEnabled()) return NextResponse.redirect(new URL("/login?error=google-off", request.url));

  const pending: GooglePending = { state: random(), nonce: random(), verifier: random(), next: safeNext(request.nextUrl.searchParams.get("next")) };
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state: pending.state,
    nonce: pending.nonce,
    code_challenge: createHash("sha256").update(pending.verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  const res = NextResponse.redirect(url);
  const cookie = pendingCookie("google");
  res.cookies.set(cookie.name, JSON.stringify(pending), cookie.options);
  return res;
}

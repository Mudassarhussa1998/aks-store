import { randomBytes } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { FACEBOOK_APP_ID, FACEBOOK_REDIRECT_URI, facebookEnabled, type FacebookPending } from "@/lib/facebook";
import { pendingCookie, safeNext } from "@/lib/oauth";

/** Step 1: send the shopper to Facebook's login dialog. */
export function GET(request: NextRequest) {
  if (!facebookEnabled()) return NextResponse.redirect(new URL("/login?error=facebook-off", request.url));

  const pending: FacebookPending = { state: randomBytes(32).toString("base64url"), next: safeNext(request.nextUrl.searchParams.get("next")) };
  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  url.search = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    redirect_uri: FACEBOOK_REDIRECT_URI,
    response_type: "code",
    scope: "public_profile,email",
    state: pending.state,
  }).toString();

  const res = NextResponse.redirect(url);
  const cookie = pendingCookie("facebook");
  res.cookies.set(cookie.name, JSON.stringify(pending), cookie.options);
  return res;
}

import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { TOKEN_COOKIE, TOKEN_COOKIE_OPTIONS } from "./session";

/** Shared pieces of the "Continue with Google / Facebook" redirects. */

export { SITE_URL } from "./site";

export function safeNext(value: string | null | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

/** Short-lived cookie that carries this sign-in's state (and nonce/PKCE for Google) from redirect to callback. */
export function pendingCookie(provider: string) {
  return {
    name: `velenzay_oauth_${provider}`,
    path: `/auth/${provider}`,
    options: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: `/auth/${provider}`, maxAge: 10 * 60 },
  };
}

export function readPending<T>(request: NextRequest, provider: string): T | null {
  try {
    return JSON.parse(request.cookies.get(pendingCookie(provider).name)?.value ?? "") as T;
  } catch {
    return null;
  }
}

export function failSignIn(request: NextRequest, provider: string, reason: string) {
  const res = NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(reason)}`, request.url));
  res.cookies.delete({ name: pendingCookie(provider).name, path: pendingCookie(provider).path });
  return res;
}

export type OAuthResult = { access_token: string; is_new: boolean; needs_phone: boolean };

/** Sets the session; customers without a mobile number finish their profile first (COD needs it). */
export function finishSignIn(request: NextRequest, provider: string, result: OAuthResult, next: string) {
  const target = result.needs_phone ? `/complete-profile?next=${encodeURIComponent(next)}${result.is_new ? "&welcome=1" : ""}` : next;
  const res = NextResponse.redirect(new URL(target, request.url));
  res.cookies.set(TOKEN_COOKIE, result.access_token, TOKEN_COOKIE_OPTIONS);
  res.cookies.delete({ name: pendingCookie(provider).name, path: pendingCookie(provider).path });
  return res;
}

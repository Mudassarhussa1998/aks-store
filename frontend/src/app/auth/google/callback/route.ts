import type { NextRequest } from "next/server";

import { api, ApiError } from "@/lib/api";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, type GooglePending } from "@/lib/google";
import { failSignIn, finishSignIn, readPending, type OAuthResult } from "@/lib/oauth";

/** Step 2: Google sends the shopper back with a one-time code. Swap it for an ID token and sign them in. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const pending = readPending<GooglePending>(request, "google");
  if (!pending) return failSignIn(request, "google", "google-expired");
  if (params.get("error")) return failSignIn(request, "google", "google-cancelled"); // closed the chooser or said no
  if (!params.get("code") || params.get("state") !== pending.state) return failSignIn(request, "google", "google-expired");

  const exchange = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.get("code")!,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
      code_verifier: pending.verifier,
    }),
  }).catch(() => null);
  const tokens = exchange?.ok ? ((await exchange.json()) as { id_token?: string }) : null;
  if (!tokens?.id_token) return failSignIn(request, "google", "google");

  try {
    const result = await api<OAuthResult>("/auth/oauth/google", { method: "POST", body: { id_token: tokens.id_token, nonce: pending.nonce } });
    return finishSignIn(request, "google", result, pending.next);
  } catch (e) {
    return failSignIn(request, "google", e instanceof ApiError && e.status === 403 ? "admin-social" : "google");
  }
}

import type { NextRequest } from "next/server";

import { api, ApiError } from "@/lib/api";
import type { FacebookPending } from "@/lib/facebook";
import { failSignIn, finishSignIn, readPending, type OAuthResult } from "@/lib/oauth";

/** Step 2: Facebook sends the shopper back with a one-time code; the API swaps it (with the app secret). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const pending = readPending<FacebookPending>(request, "facebook");
  if (!pending) return failSignIn(request, "facebook", "facebook-expired");
  if (params.get("error")) return failSignIn(request, "facebook", "facebook-cancelled");
  if (!params.get("code") || params.get("state") !== pending.state) return failSignIn(request, "facebook", "facebook-expired");

  try {
    const result = await api<OAuthResult>("/auth/oauth/facebook", { method: "POST", body: { code: params.get("code") } });
    return finishSignIn(request, "facebook", result, pending.next);
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 0;
    return failSignIn(request, "facebook", status === 403 ? "admin-social" : status === 400 ? "facebook-noemail" : "facebook");
  }
}

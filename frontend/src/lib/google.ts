import "server-only";

import { SITE_URL } from "./site";

/** "Continue with Google" settings. The button only shows when both values are set. */
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
export const googleEnabled = () => Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
export const GOOGLE_REDIRECT_URI = `${SITE_URL}/auth/google/callback`;

export type GooglePending = { state: string; nonce: string; verifier: string; next: string };

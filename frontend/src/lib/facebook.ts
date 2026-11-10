import "server-only";

import { SITE_URL } from "./site";

/** "Continue with Facebook". Only the app id is needed here; the API holds the secret and swaps the code. */
export const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID ?? "";
export const facebookEnabled = () => Boolean(FACEBOOK_APP_ID);
export const FACEBOOK_REDIRECT_URI = `${SITE_URL}/auth/facebook/callback`;

export type FacebookPending = { state: string; next: string };

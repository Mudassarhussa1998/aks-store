import "server-only";

import { cacheTag } from "next/cache";
import { cookies } from "next/headers";

import { api, ApiError } from "./api";
import type { User } from "./types";

export const TOKEN_COOKIE = "rawaj_token";
export const USER_TAG = "current-user";

export async function getToken(): Promise<string | null> {
  return (await cookies()).get(TOKEN_COOKIE)?.value ?? null;
}

/** The signed-in user, or null. Cached per browser session; actions that change the user call updateTag(USER_TAG). */
export async function getCurrentUser(): Promise<User | null> {
  "use cache: private";
  cacheTag(USER_TAG);
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  try {
    return await api<User>("/auth/me", { token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

export const TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
} as const;

export async function setToken(token: string) {
  (await cookies()).set(TOKEN_COOKIE, token, TOKEN_COOKIE_OPTIONS);
}

export async function clearToken() {
  (await cookies()).delete(TOKEN_COOKIE);
}

"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import { clearToken, getToken, setToken, USER_TAG } from "@/lib/session";
import type { ActionResult, User } from "@/lib/types";

export type AuthState = { error?: string; values?: Record<string, string> };
type TokenOut = { access_token: string; user: User };
export type Channel = "email" | "phone";

function safeNext(next: FormDataEntryValue | null) {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

const message = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const identifier = String(form.get("identifier") ?? "").trim();
  try {
    const { access_token } = await api<TokenOut>("/auth/login", {
      method: "POST",
      body: { identifier, password: String(form.get("password") ?? "") },
    });
    await setToken(access_token);
  } catch (e) {
    return { error: message(e, "Could not sign in"), values: { identifier } };
  }
  redirect(safeNext(form.get("next")));
}

export async function register(_: AuthState, form: FormData): Promise<AuthState> {
  const values = {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    phone: String(form.get("phone") ?? ""),
  };
  try {
    const { access_token } = await api<TokenOut>("/auth/register", {
      method: "POST",
      body: { ...values, password: String(form.get("password") ?? "") },
    });
    await setToken(access_token);
  } catch (e) {
    return { error: message(e, "Could not create your account"), values };
  }
  // The API has already emailed a code, so the verify page starts on "enter code".
  redirect(`/verify?sent=email&next=${encodeURIComponent(safeNext(form.get("next")))}`);
}

export async function logout() {
  await clearToken();
  redirect("/");
}

// ---------- verification ----------

export async function sendCode(channel: Channel): Promise<ActionResult<{ sent_to: string; retry_after: number }>> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Please sign in first." };
  try {
    return { ok: true, data: await api("/auth/verify/send", { method: "POST", token, body: { channel } }) };
  } catch (e) {
    return { ok: false, error: message(e, "Could not send the code. Please try again.") };
  }
}

export async function confirmCode(channel: Channel, code: string): Promise<ActionResult<User>> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Please sign in first." };
  try {
    const user = await api<User>("/auth/verify/confirm", { method: "POST", token, body: { channel, code } });
    updateTag(USER_TAG);
    return { ok: true, data: user };
  } catch (e) {
    return { ok: false, error: message(e, "Could not check the code. Please try again.") };
  }
}

// ---------- passwords ----------

export async function forgotPassword(identifier: string): Promise<ActionResult<string>> {
  try {
    const res = await api<{ detail: string }>("/auth/password/forgot", { method: "POST", body: { identifier: identifier.trim() } });
    return { ok: true, data: res.detail };
  } catch (e) {
    return { ok: false, error: message(e, "Could not send the code. Please try again.") };
  }
}

export async function resetPassword(identifier: string, code: string, password: string): Promise<ActionResult<null>> {
  try {
    const { access_token } = await api<TokenOut>("/auth/password/reset", {
      method: "POST",
      body: { identifier: identifier.trim(), code, password },
    });
    await setToken(access_token);
    updateTag(USER_TAG);
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: message(e, "Could not reset your password. Please try again.") };
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<ActionResult<null>> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Please sign in first." };
  try {
    const { access_token } = await api<TokenOut>("/auth/password/change", {
      method: "POST",
      token,
      body: { current_password: currentPassword || null, new_password: newPassword },
    });
    await setToken(access_token); // other devices are signed out; this one keeps going
    updateTag(USER_TAG); // has_password may have changed
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: message(e, "Could not change your password. Please try again.") };
  }
}

export async function deleteAccount(password: string): Promise<ActionResult<null>> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Please sign in first." };
  try {
    await api<null>("/auth/delete-account", { method: "POST", token, body: { password: password || null } });
  } catch (e) {
    return { ok: false, error: message(e, "Could not delete your account. Please try again.") };
  }
  await clearToken();
  redirect("/?account=deleted");
}

"use server";

import { refresh, revalidateTag, updateTag } from "next/cache";

import { api, ApiError } from "@/lib/api";
import { getToken, USER_TAG } from "@/lib/session";
import type { ActionResult, Address, Review, User } from "@/lib/types";

async function authed<T>(fn: (token: string) => Promise<T>): Promise<ActionResult<T>> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Please sign in first." };
  try {
    return { ok: true, data: await fn(token) };
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : "Something went wrong. Please try again." };
  }
}

export async function wishlistIds(): Promise<number[]> {
  const token = await getToken();
  if (!token) return [];
  try {
    return await api<number[]>("/me/wishlist/ids", { token });
  } catch {
    return [];
  }
}

export async function setWishlisted(productId: number, on: boolean) {
  return authed((token) => api<null>(`/me/wishlist/${productId}`, { method: on ? "PUT" : "DELETE", token }));
}

export async function trackView(productId: number) {
  const token = await getToken();
  if (token) await api(`/me/recent/${productId}`, { method: "PUT", token }).catch(() => null);
}

export async function writeReview(slug: string, input: { rating: number; title: string; body: string }) {
  const result = await authed((token) =>
    api<Review>(`/products/${encodeURIComponent(slug)}/reviews`, { method: "POST", token, body: input }),
  );
  if (result.ok) revalidateTag("catalog", "max");
  return result;
}

export async function editMyReview(id: number, input: { rating: number; title: string; body: string }) {
  const result = await authed((token) => api<Review>(`/me/reviews/${id}`, { method: "PUT", token, body: input }));
  if (result.ok) {
    revalidateTag("catalog", "max");
    refresh();
  }
  return result;
}

export async function deleteMyReview(id: number) {
  const result = await authed((token) => api<null>(`/me/reviews/${id}`, { method: "DELETE", token }));
  if (result.ok) {
    revalidateTag("catalog", "max");
    refresh();
  }
  return result;
}

export async function markHelpful(reviewId: number) {
  await api(`/reviews/${reviewId}/helpful`, { method: "POST" }).catch(() => null);
}

export type ProfileInput = Partial<Pick<User, "name" | "email" | "phone" | "whatsapp_updates" | "gender" | "date_of_birth" | "city">>;

export async function updateProfile(input: ProfileInput) {
  const result = await authed((token) => api<User>("/auth/me", { method: "PATCH", token, body: input }));
  if (result.ok) updateTag(USER_TAG);
  return result;
}

export type AddressInput = Omit<Address, "id">;

export async function saveAddress(input: AddressInput, id?: number) {
  const result = await authed((token) =>
    api<Address>(id ? `/me/addresses/${id}` : "/me/addresses", { method: id ? "PUT" : "POST", token, body: input }),
  );
  if (result.ok) refresh();
  return result;
}

export async function deleteAddress(id: number) {
  const result = await authed((token) => api<null>(`/me/addresses/${id}`, { method: "DELETE", token }));
  if (result.ok) refresh();
  return result;
}

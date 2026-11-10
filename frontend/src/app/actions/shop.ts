"use server";

import { revalidateTag } from "next/cache";

import { api, ApiError } from "@/lib/api";
import { getToken } from "@/lib/session";
import type { ActionResult, CartLine, Order, ProductCard, Quote } from "@/lib/types";

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : "Something went wrong. Please try again." };
  }
}

export async function quoteCart(items: CartLine[], coupon?: string | null) {
  return run(() => api<Quote>("/cart/quote", { method: "POST", body: { items, coupon: coupon || null } }));
}

export type CheckoutInput = {
  items: CartLine[];
  coupon?: string | null;
  name: string;
  phone: string;
  email?: string;
  city: string;
  area: string;
  address: string;
  note: string;
  save_address: boolean;
};

export async function placeOrder(input: CheckoutInput) {
  const token = await getToken();
  const result = await run(() => api<Order>("/orders", { method: "POST", token, body: input }));
  if (result.ok) revalidateTag("catalog", "max"); // stock changed
  return result;
}

export async function trackOrder(number: string, phone: string) {
  return run(() => api<Order>("/orders/track", { query: { number: number.trim(), phone } }));
}

/** Signed-in customers are recognised by their session; guests pass the phone used at checkout. */
export async function cancelOrder(number: string, reason: string, phone?: string) {
  const token = await getToken();
  const result = await run(() =>
    api<Order>(`/orders/${encodeURIComponent(number)}/cancel`, { method: "POST", token, body: { reason, phone: phone || null } }),
  );
  if (result.ok) revalidateTag("catalog", "max"); // stock went back
  return result;
}

export async function searchSuggest(q: string) {
  if (q.trim().length < 2) return [] as ProductCard[];
  try {
    return await api<ProductCard[]>("/search/suggest", { query: { q: q.trim() } });
  } catch {
    return [];
  }
}

"use server";

import { refresh, updateTag } from "next/cache";

import type { AdminCategory, AdminProduct, CategoryInput, Coupon, CouponInput, ProductInput } from "@/components/admin/types";
import { api, ApiError } from "@/lib/api";
import { getToken } from "@/lib/session";
import type { ActionResult, Order, OrderStatus } from "@/lib/types";

async function admin<T>(fn: (token: string) => Promise<T>, { catalog = false } = {}): Promise<ActionResult<T>> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Please sign in again." };
  try {
    const data = await fn(token);
    // updateTag (not revalidateTag) so the very next store visit shows the change instead of one stale page.
    if (catalog) updateTag("catalog");
    refresh();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : "Something went wrong. Please try again." };
  }
}

export async function updateOrderStatus(
  number: string,
  input: { status: OrderStatus; note: string; courier?: string | null; tracking_number?: string | null },
) {
  return admin((token) => api<Order>(`/admin/orders/${encodeURIComponent(number)}`, { method: "PATCH", token, body: input }), {
    catalog: true, // cancel/return puts stock back
  });
}

export async function saveProduct(id: number | null, input: ProductInput) {
  return admin(
    (token) =>
      api<AdminProduct>(id ? `/admin/products/${id}` : "/admin/products", { method: id ? "PUT" : "POST", token, body: input }),
    { catalog: true },
  );
}

export async function archiveProduct(id: number) {
  return admin((token) => api<null>(`/admin/products/${id}`, { method: "DELETE", token }), { catalog: true });
}

export async function setProductFlags(id: number, flags: { is_active?: boolean; is_featured?: boolean }) {
  return admin((token) => api<null>(`/admin/products/${id}`, { method: "PATCH", token, body: flags }), { catalog: true });
}

export async function bulkProducts(ids: number[], action: "show" | "hide" | "feature" | "unfeature") {
  return admin((token) => api<{ updated: number }>("/admin/products/bulk", { method: "POST", token, body: { ids, action } }), {
    catalog: true,
  });
}

export async function duplicateProduct(id: number) {
  return admin((token) => api<AdminProduct>(`/admin/products/${id}/duplicate`, { method: "POST", token }));
}

export async function updateStock(items: { id: number; stock: number }[]) {
  return admin((token) => api<{ updated: number }>("/admin/inventory", { method: "PUT", token, body: { items } }), { catalog: true });
}

export async function reorderCategories(ids: number[]) {
  return admin((token) => api<null>("/admin/categories-order", { method: "PUT", token, body: { ids } }), { catalog: true });
}

export async function deleteCategory(id: number) {
  return admin((token) => api<null>(`/admin/categories/${id}`, { method: "DELETE", token }), { catalog: true });
}

export async function saveCategory(id: number | null, input: CategoryInput) {
  return admin(
    (token) =>
      api<AdminCategory>(id ? `/admin/categories/${id}` : "/admin/categories", { method: id ? "PUT" : "POST", token, body: input }),
    { catalog: true },
  );
}

export async function saveCoupon(id: number | null, input: CouponInput) {
  return admin((token) =>
    api<Coupon>(id ? `/admin/coupons/${id}` : "/admin/coupons", { method: id ? "PUT" : "POST", token, body: input }),
  );
}

export async function moderateReview(id: number, publish: boolean) {
  return admin((token) => api<null>(`/admin/reviews/${id}`, { method: "PATCH", token, query: { publish } }), { catalog: true });
}

export async function deleteReview(id: number) {
  return admin((token) => api<null>(`/admin/reviews/${id}`, { method: "DELETE", token }), { catalog: true });
}

export async function markMessage(id: number, read: boolean) {
  return admin((token) => api<null>(`/admin/messages/${id}`, { method: "PATCH", token, query: { read } }));
}

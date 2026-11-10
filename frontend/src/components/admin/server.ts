import "server-only";

import { api } from "@/lib/api";
import { getToken } from "@/lib/session";

/** Authenticated admin read. Pages call this inside a Suspense boundary (it reads the cookie). */
export async function adminApi<T>(path: string, query?: Record<string, string | number | undefined>) {
  return api<T>(`/admin${path}`, { token: await getToken(), query });
}

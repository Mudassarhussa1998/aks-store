import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { api, ApiError } from "./api";
import type { Category, ProductCard, ProductDetail, ProductPage, ReviewPage } from "./types";

/** All public catalog reads are cached and tagged "catalog"; admin edits revalidate the tag. */

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  return api<Category[]>("/categories");
}

export type ListQuery = {
  category?: string;
  q?: string;
  size?: string[];
  color?: string[];
  quality?: string[];
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  sort?: string;
  page?: number;
  page_size?: number;
  facets?: boolean;
};

export async function listProducts(query: ListQuery): Promise<ProductPage> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  return api<ProductPage>("/products", { query });
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog", `product:${slug}`);
  try {
    return await api<ProductDetail>(`/products/${encodeURIComponent(slug)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function getRelated(slug: string): Promise<ProductCard[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  return api<ProductCard[]>(`/products/${encodeURIComponent(slug)}/related`);
}

export async function getReviews(slug: string, page = 1): Promise<ReviewPage> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog", `reviews:${slug}`);
  return api<ReviewPage>(`/products/${encodeURIComponent(slug)}/reviews`, { query: { page } });
}

export function findCategory(tree: Category[], slug: string): { node: Category; path: Category[] } | null {
  for (const node of tree) {
    if (node.slug === slug) return { node, path: [node] };
    const hit = findCategory(node.children, slug);
    if (hit) return { node: hit.node, path: [node, ...hit.path] };
  }
  return null;
}

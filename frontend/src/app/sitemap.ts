import type { MetadataRoute } from "next";

import { getCategories, listProducts } from "@/lib/catalog";
import { absolute } from "@/lib/site";
import type { Category, ProductCard } from "@/lib/types";

const PAGES = ["/", "/shop", "/about", "/careers", "/contact", "/faq", "/track", "/terms"];
const HELP = ["delivery", "returns", "privacy", "delete-your-data"];

/** Every public page Google should know about: home, categories, products (with photos) and information pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tree, first] = await Promise.all([getCategories(), listProducts({ page_size: 60, sort: "newest" })]);
  const products: ProductCard[] = [...first.items];
  for (let page = 2; page <= first.pages; page++) products.push(...(await listProducts({ page_size: 60, sort: "newest", page })).items);
  const categories = tree.flatMap((c: Category) => [c, ...c.children]);

  return [
    ...PAGES.map((path) => ({ url: absolute(path), changeFrequency: path === "/" ? ("daily" as const) : ("monthly" as const), priority: path === "/" ? 1 : 0.5 })),
    ...categories.map((c) => ({ url: absolute(`/c/${c.slug}`), changeFrequency: "daily" as const, priority: c.parent_id ? 0.7 : 0.8 })),
    ...products.map((p) => ({ url: absolute(`/p/${p.slug}`), changeFrequency: "weekly" as const, priority: 0.9, images: p.image ? [`${p.image}-1080.webp`] : undefined })),
    ...HELP.map((slug) => ({ url: absolute(`/help/${slug}`), changeFrequency: "yearly" as const, priority: 0.3 })),
  ];
}

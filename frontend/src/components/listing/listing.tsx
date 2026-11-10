import Link from "next/link";

import { listProducts, type ListQuery } from "@/lib/catalog";

import { ProductGrid } from "../product/product-card";
import { Filters, SortSelect } from "./filters";

export type SearchParams = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]);
const num = (v: string | string[] | undefined) => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export function parseQuery(sp: SearchParams): ListQuery {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined));
  return {
    size: list(sp.size),
    color: list(sp.color),
    quality: list(sp.quality),
    min_price: num(sp.min_price),
    max_price: num(sp.max_price),
    min_rating: num(sp.min_rating),
    sort: one("sort") ?? "recommended",
    page: num(sp.page) ?? 1,
  };
}

/** The product grid plus filters for any listing (category, all products, search). */
export async function Listing({
  base,
  query,
  searchParams,
  basePath,
  clearHref = basePath,
}: {
  base: Pick<ListQuery, "category" | "q">;
  query: ListQuery;
  searchParams: SearchParams;
  basePath: string;
  clearHref?: string;
}) {
  const data = await listProducts({ ...base, ...query, page_size: 24, facets: true });

  const pageHref = (page: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) for (const x of list(v) ?? []) if (k !== "page") qs.append(k, x);
    if (page > 1) qs.set("page", String(page));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[15px] text-muted">
          {data.total} {data.total === 1 ? "product" : "products"}
        </p>
        <SortSelect value={query.sort ?? "recommended"} />
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-12">
        {data.facets && <Filters facets={data.facets} total={data.total} />}
        <section aria-label="Products" className="min-w-0 flex-1">
          {data.items.length > 0 ? (
            <ProductGrid products={data.items} priorityCount={4} />
          ) : (
            <div className="rounded-3xl bg-mist px-6 py-14 text-center">
              <p className="text-lg">No products match these filters.</p>
              <Link href={clearHref} className="mt-4 inline-block text-sm font-medium underline">
                Clear all filters
              </Link>
            </div>
          )}
          {data.pages > 1 && (
            <nav aria-label="Pagination" className="mt-12 flex flex-wrap justify-center gap-2">
              {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={pageHref(p)}
                  aria-current={p === data.page ? "page" : undefined}
                  className={`flex h-11 min-w-11 items-center justify-center rounded border text-sm ${p === data.page ? "border-ink font-semibold" : "border-line"}`}
                >
                  {p}
                </Link>
              ))}
            </nav>
          )}
        </section>
      </div>
    </>
  );
}

export function ListingSkeleton() {
  return (
    <div className="grid animate-pulse grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3 lg:grid-cols-4" aria-label="Loading products">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="aspect-[3/4] rounded-xl bg-sand" />
          <div className="h-4 w-3/4 rounded bg-sand" />
          <div className="h-4 w-1/3 rounded bg-sand" />
        </div>
      ))}
    </div>
  );
}

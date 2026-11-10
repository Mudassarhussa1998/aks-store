import type { Metadata } from "next";
import { Suspense } from "react";

import { Listing, ListingSkeleton, parseQuery, type SearchParams } from "@/components/listing/listing";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-16">
      <Suspense fallback={<ListingSkeleton />}>
        {searchParams.then((sp) => {
          const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";
          return (
            <>
              <form action="/search" role="search" className="mb-8 flex max-w-xl gap-2">
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Search towels, kurtas, blankets…"
                  aria-label="Search products"
                  className="min-w-0 flex-1 rounded-full border border-line-strong px-5 py-3"
                />
                <button className="cursor-pointer rounded-full bg-forest px-6 font-medium text-white">Search</button>
              </form>
              <h1 className="tracking-tight mb-6 text-4xl font-semibold">
                {q ? (
                  <>
                    Results for “{q}”
                  </>
                ) : (
                  "Search"
                )}
              </h1>
              {q ? (
                <Listing base={{ q }} query={parseQuery(sp)} searchParams={sp} basePath="/search" clearHref={`/search?q=${encodeURIComponent(q)}`} />
              ) : (
                <p className="text-muted">Search by product name, fabric or category.</p>
              )}
            </>
          );
        })}
      </Suspense>
    </div>
  );
}

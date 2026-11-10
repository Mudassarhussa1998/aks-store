import type { Metadata } from "next";
import { Suspense } from "react";

import { Listing, ListingSkeleton, parseQuery, type SearchParams } from "@/components/listing/listing";

export const metadata: Metadata = {
  title: "Shop All Clothing & Home Essentials",
  description: "Browse every Rawaj.pk product: lawn suits, kurtas, shoes, blankets, towels, pillows and curtains. Cash on Delivery across Pakistan.",
  alternates: { canonical: "/shop" },
};

export default function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-16">
      <h1 className="tracking-tight mb-6 text-4xl font-semibold md:text-5xl">
        All products
      </h1>
      <Suspense fallback={<ListingSkeleton />}>
        {searchParams.then((sp) => (
          <Listing base={{}} query={parseQuery(sp)} searchParams={sp} basePath="/shop" />
        ))}
      </Suspense>
    </div>
  );
}

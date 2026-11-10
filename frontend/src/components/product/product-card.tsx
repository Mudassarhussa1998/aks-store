import Image from "next/image";
import Link from "next/link";

import { rs } from "@/lib/format";
import type { ProductCard as Card } from "@/lib/types";

import { WishlistButton } from "../wishlist/wishlist-button";

const BADGE: Record<string, string> = {
  Sale: "bg-sale text-white",
  New: "bg-forest text-white",
  Bestseller: "bg-white text-ink",
};

export function ProductCard({ product: p, priority = false }: { product: Card; priority?: boolean }) {
  return (
    <div className="group relative flex flex-col gap-2.5">
      <Link
        href={`/p/${p.slug}`}
        aria-label={p.name}
        className="zoom relative block aspect-[3/4] overflow-hidden rounded-xl bg-sand"
      >
        {p.image && (
          <Image
            src={p.image}
            alt=""
            fill
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
          />
        )}
        {p.badge && (
          <span
            className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wider uppercase ${BADGE[p.badge] ?? "bg-white text-ink"}`}
          >
            {p.badge}
          </span>
        )}
        {!p.in_stock && (
          <span className="absolute inset-x-3 top-1/2 rounded-full bg-white/90 py-2 text-center text-xs font-semibold">
            Out of stock
          </span>
        )}
        <span className="absolute inset-x-3 bottom-3 flex min-h-11 translate-y-[130%] items-center justify-center rounded-full bg-white/95 text-[13px] font-semibold transition-transform duration-300 group-hover:translate-y-0 group-focus-within:translate-y-0 [@media(hover:none)]:translate-y-0">
          Quick view · Choose options
        </span>
      </Link>
      <WishlistButton productId={p.id} className="absolute top-2 right-2" />
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="tracking-wider text-muted uppercase">{p.category}</span>
        {p.rating_count > 0 && (
          <span className="text-body">
            <span className="text-star">★</span> {p.rating_avg.toFixed(1)}
          </span>
        )}
      </div>
      <Link href={`/p/${p.slug}`} className="-mt-1 text-base font-medium hover:text-forest">
        {p.name}
      </Link>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-baseline gap-2">
          <span className="font-semibold">{rs(p.price)}</span>
          {p.compare_at_price && p.compare_at_price > p.price && (
            <span className="text-[13px] text-muted line-through">{rs(p.compare_at_price)}</span>
          )}
        </span>
        <span className="flex gap-1" aria-label={`${p.colors.length} colours`}>
          {p.colors.map((c) => (
            <span key={c} className="h-3 w-3 rounded-full ring-1 ring-line-strong" style={{ background: c }} />
          ))}
        </span>
      </div>
    </div>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: Card[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}

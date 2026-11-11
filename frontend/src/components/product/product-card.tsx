import Image from "next/image";
import Link from "next/link";

import { rs } from "@/lib/format";
import type { ProductCard as Card } from "@/lib/types";

import { BagIcon } from "../ui/icons";
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
            className={`absolute top-2.5 left-2.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase sm:top-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-[11px] ${BADGE[p.badge] ?? "bg-white text-ink"}`}
          >
            {p.badge}
          </span>
        )}
        {!p.in_stock && (
          <span className="absolute inset-x-3 top-1/2 rounded-full bg-white/90 py-2 text-center text-xs font-semibold">
            Out of stock
          </span>
        )}
        {p.in_stock && (
          <>
            {/* Mouse: a "Choose options" pill slides up on hover. Touch screens: a small bag button instead. */}
            <span
              aria-hidden
              className="absolute inset-x-3 bottom-3 hidden h-10 translate-y-[150%] items-center justify-center gap-2 rounded-full bg-white/95 text-[13px] font-medium whitespace-nowrap shadow-sm backdrop-blur transition-transform duration-300 group-hover:translate-y-0 group-focus-within:translate-y-0 [@media(hover:hover)]:flex"
            >
              <BagIcon size={16} />
              Choose options
            </span>
            <span
              aria-hidden
              className="absolute right-2 bottom-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm backdrop-blur [@media(hover:hover)]:hidden"
            >
              <BagIcon size={17} />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-forest text-[11px] leading-none font-semibold text-white">+</span>
            </span>
          </>
        )}
      </Link>
      <WishlistButton productId={p.id} small className="absolute top-2 right-2" />
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="tracking-wider text-muted uppercase">{p.category}</span>
        {p.rating_count > 0 && (
          <span className="text-body">
            <span className="text-star">★</span> {p.rating_avg.toFixed(1)}
          </span>
        )}
      </div>
      <Link href={`/p/${p.slug}`} className="-mt-1 text-[15px] leading-snug font-medium hover:text-forest sm:text-base">
        {p.name}
      </Link>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-baseline gap-2">
          <span className="font-semibold">{rs(p.price)}</span>
          {p.compare_at_price && p.compare_at_price > p.price && (
            <span className="text-[13px] text-muted line-through">{rs(p.compare_at_price)}</span>
          )}
        </span>
        <span role="img" className="flex gap-1" aria-label={`${p.colors.length} ${p.colors.length === 1 ? "colour" : "colours"}`}>
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

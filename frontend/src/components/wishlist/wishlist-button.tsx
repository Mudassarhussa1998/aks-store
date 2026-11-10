"use client";

import { HeartIcon } from "../ui/icons";
import { useWishlist } from "./wishlist-store";

export function WishlistButton({ productId, className = "", bordered = false }: { productId: number; className?: string; bordered?: boolean }) {
  const { has, toggle } = useWishlist();
  const on = has(productId);
  return (
    <button
      type="button"
      aria-label={on ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={on}
      onClick={() => toggle(productId)}
      className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white transition-transform active:scale-90 ${on ? "text-sale" : "text-ink"} ${bordered ? "rounded-md border border-line" : ""} ${className}`}
    >
      <HeartIcon size={20} filled={on} />
    </button>
  );
}

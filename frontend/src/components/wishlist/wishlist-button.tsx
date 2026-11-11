"use client";

import { HeartIcon } from "../ui/icons";
import { useWishlist } from "./wishlist-store";

export function WishlistButton({
  productId,
  className = "",
  bordered = false,
  small = false,
}: {
  productId: number;
  className?: string;
  bordered?: boolean;
  small?: boolean; // on product cards: a little smaller on phones, with a shadow to stand out on light photos
}) {
  const { has, toggle } = useWishlist();
  const on = has(productId);
  return (
    <button
      type="button"
      aria-label={on ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={on}
      onClick={() => toggle(productId)}
      className={`flex cursor-pointer items-center justify-center rounded-full bg-white transition-transform active:scale-90 ${
        small ? "h-9 w-9 bg-white/95 shadow-sm backdrop-blur sm:h-10 sm:w-10" : "h-11 w-11"
      } ${on ? "text-sale" : "text-ink"} ${bordered ? "rounded-md border border-line" : ""} ${className}`}
    >
      <HeartIcon size={small ? 18 : 20} filled={on} />
    </button>
  );
}

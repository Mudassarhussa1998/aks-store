"use client";

import Link from "next/link";

import { useCart } from "../cart/cart-store";
import { BagIcon } from "../ui/icons";

export function CartButton() {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
      className="relative flex h-11 w-11 items-center justify-center rounded-full hover:bg-sand"
    >
      <BagIcon />
      {count > 0 && (
        <span className="absolute top-1 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-forest px-1 text-[11px] font-semibold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

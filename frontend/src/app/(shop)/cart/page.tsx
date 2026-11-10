import type { Metadata } from "next";

import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-16">
      <h1 className="tracking-tight mb-8 text-4xl font-semibold">Your cart</h1>
      <CartView />
    </div>
  );
}

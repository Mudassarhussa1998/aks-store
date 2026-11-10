"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { rs } from "@/lib/format";

import { useWishlist } from "../wishlist/wishlist-store";
import { useCart } from "./cart-store";
import { SummaryRows } from "./order-summary";
import { readCoupon, saveCoupon, useQuote } from "./use-quote";

export function CartView() {
  const cart = useCart();
  const wishlist = useWishlist();
  const [coupon, setCoupon] = useState(readCoupon);
  const [couponInput, setCouponInput] = useState(coupon);
  const { quote, error } = useQuote(coupon);

  if (!cart.ready) return <div className="h-64 animate-pulse rounded-xl bg-sand" />;

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl bg-sand px-6 py-14 text-center">
        <p className="text-lg">Your cart is empty.</p>
        <Link href="/" className="rounded bg-forest px-7 py-3.5 font-medium text-white hover:text-white">
          Continue shopping
        </Link>
      </div>
    );
  }

  const lineFor = (variantId: number) => quote?.lines.find((l) => l.variant_id === variantId);
  const problems = quote?.lines.filter((l) => !l.available) ?? [];

  return (
    <div className="flex flex-wrap items-start gap-12">
      <section aria-label="Cart items" className="min-w-0 flex-[999_1_560px] border-t border-line">
        {problems.length > 0 && (
          <p role="alert" className="mt-4 rounded bg-sale-soft px-4 py-3 text-sm text-sale">
            Some items don&apos;t have enough stock. Lower the quantity or remove them to continue.
          </p>
        )}
        {cart.items.map((item) => {
          const line = lineFor(item.variantId);
          const price = line?.unit_price ?? item.price;
          const missing = quote && !line;
          return (
            <article key={item.variantId} className="flex flex-wrap gap-5 border-b border-line py-6">
              <Link href={`/p/${item.slug}`} aria-label={item.name} className="relative h-[150px] w-[120px] shrink-0 overflow-hidden rounded bg-sand">
                {item.image && <Image src={item.image} alt="" fill sizes="120px" className="object-cover" />}
              </Link>
              <div className="flex flex-[1_1_240px] flex-col gap-1.5">
                <Link href={`/p/${item.slug}`} className="text-base font-medium">
                  {item.name}
                </Link>
                <span className="text-sm text-muted">{item.label}</span>
                <span className="text-sm text-muted">{rs(price)} each</span>
                {line && !line.available && (
                  <span className="text-sm text-sale">{line.stock > 0 ? `Only ${line.stock} left` : "Sold out"}</span>
                )}
                {missing && <span className="text-sm text-sale">No longer available</span>}
                <div className="mt-auto flex flex-wrap items-center gap-4">
                  <div className="flex items-center rounded border border-line">
                    <button type="button" aria-label="Decrease quantity" onClick={() => cart.setQuantity(item.variantId, item.quantity - 1)} className="h-11 w-11 cursor-pointer text-lg">
                      −
                    </button>
                    <span className="min-w-7 text-center font-semibold">{item.quantity}</span>
                    <button type="button" aria-label="Increase quantity" onClick={() => cart.setQuantity(item.variantId, item.quantity + 1)} className="h-11 w-11 cursor-pointer text-lg">
                      +
                    </button>
                  </div>
                  {line && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!wishlist.has(line.product_id)) wishlist.toggle(line.product_id);
                        cart.remove(item.variantId);
                      }}
                      className="cursor-pointer py-3 text-[13px] underline"
                    >
                      Move to wishlist
                    </button>
                  )}
                  <button type="button" onClick={() => cart.remove(item.variantId)} className="cursor-pointer py-3 text-[13px] text-sale underline">
                    Remove
                  </button>
                </div>
              </div>
              <span className="text-base font-semibold">{rs(price * item.quantity)}</span>
            </article>
          );
        })}
        <Link href="/" className="mt-5 inline-block text-sm underline">
          Continue shopping
        </Link>
      </section>

      <aside aria-label="Order summary" className="flex w-full flex-[1_1_320px] flex-col gap-4 rounded-xl bg-sand p-7 lg:max-w-[420px]">
        <h2 className="text-lg font-semibold">Order summary</h2>
        {error && <p className="text-sm text-sale">{error}</p>}
        <SummaryRows quote={quote} />
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const code = couponInput.trim().toUpperCase();
            setCoupon(code);
            saveCoupon(code);
          }}
        >
          <label htmlFor="coupon" className="text-sm font-medium">
            Coupon code
          </label>
          <div className="flex gap-2">
            <input id="coupon" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="e.g. WINTER10" className="min-w-0 flex-1 rounded border border-line-strong bg-white px-3 py-3 uppercase" />
            <button className="cursor-pointer rounded border border-ink bg-white px-4 font-medium">Apply</button>
          </div>
          {quote?.coupon_error && <span className="text-[13px] text-sale">{quote.coupon_error}</span>}
          {quote?.coupon && <span className="text-[13px] text-ok">{quote.coupon} applied</span>}
        </form>
        <Link
          href="/checkout"
          aria-disabled={problems.length > 0}
          className={`flex min-h-[52px] items-center justify-center rounded text-[15px] font-medium text-white hover:text-white ${problems.length ? "pointer-events-none bg-line-strong" : "bg-forest"}`}
        >
          Proceed to checkout
        </Link>
        <span className="text-center text-[13px] text-body">Pay with Cash on Delivery · 7-day easy returns</span>
      </aside>
    </div>
  );
}

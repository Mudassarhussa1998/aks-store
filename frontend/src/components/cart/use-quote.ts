"use client";

import { useEffect, useState } from "react";

import { quoteCart } from "@/app/actions/shop";
import type { Quote } from "@/lib/types";

import { useCart } from "./cart-store";

const COUPON_KEY = "velenzay_coupon";

export function readCoupon() {
  try {
    return sessionStorage.getItem(COUPON_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveCoupon(code: string) {
  try {
    if (code) sessionStorage.setItem(COUPON_KEY, code);
    else sessionStorage.removeItem(COUPON_KEY);
  } catch {
    // ignore: the coupon just won't survive a reload
  }
}

/** Server-checked prices, stock and delivery for the current cart. Re-runs whenever the cart or coupon changes. */
export function useQuote(coupon: string) {
  const { items, ready } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(items.map((i) => [i.variantId, i.quantity])) + coupon;

  useEffect(() => {
    if (!ready || items.length === 0) return;
    let live = true;
    const t = setTimeout(async () => {
      const res = await quoteCart(
        items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
        coupon,
      );
      if (!live) return;
      if (res.ok) {
        setQuote(res.data);
        setError(null);
      } else setError(res.error);
    }, 150);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures items + coupon
  }, [key, ready]);

  return { quote: items.length ? quote : null, error };
}

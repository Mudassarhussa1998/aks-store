"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cancelOrder } from "@/app/actions/shop";
import type { Order } from "@/lib/types";

import { useCart } from "../cart/cart-store";

const REASONS = ["Ordered by mistake", "Want a different size or colour", "Found a better price", "Delivery is taking too long", "Other"];
const CANCELLABLE = ["pending", "confirmed"];

/**
 * Cancel (until the order ships) and Buy again. Guests pass the checkout `phone` to prove the order is theirs;
 * `onChange` lets the tracking page swap in the updated order, otherwise the page is refreshed.
 */
export function OrderActions({ order, phone, onChange }: { order: Order; phone?: string; onChange?: (order: Order) => void }) {
  const router = useRouter();
  const cart = useCart();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const reorderable = order.items.filter((i) => i.variant_id);

  const buyAgain = () => {
    for (const i of reorderable) {
      cart.add({ variantId: i.variant_id!, quantity: i.quantity, slug: i.product_slug, name: i.product_name, label: i.variant_label, price: i.unit_price, image: i.image_url });
    }
    router.push("/cart"); // the cart re-checks today's prices and stock
  };

  const cancel = () =>
    start(async () => {
      setError(null);
      const res = await cancelOrder(order.number, reason, phone);
      if (!res.ok) return setError(res.error);
      setConfirming(false);
      if (onChange) onChange(res.data);
      else router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {reorderable.length > 0 && (
          <button type="button" onClick={buyAgain} className="h-10 cursor-pointer rounded-full bg-forest px-5 text-sm font-medium text-white hover:bg-[#16302a]">
            Buy again
          </button>
        )}
        {CANCELLABLE.includes(order.status) && !confirming && (
          <button type="button" onClick={() => setConfirming(true)} className="h-10 cursor-pointer rounded-full border border-line-strong px-5 text-sm font-medium text-sale hover:border-sale">
            Cancel order
          </button>
        )}
      </div>
      {confirming && (
        <div role="group" aria-label="Cancel this order" className="flex animate-rise flex-col gap-3 rounded-2xl border border-line bg-mist/60 p-4">
          <p className="text-[15px] font-medium">Cancel order #{order.number}?</p>
          <label className="flex flex-col gap-1.5 text-sm">
            Reason
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-11 cursor-pointer rounded-xl border border-line-strong bg-white px-3">
              {REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          {error && (
            <p role="alert" className="rounded-xl bg-sale-soft px-3 py-2.5 text-sm text-sale">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={cancel} disabled={pending} className="h-10 cursor-pointer rounded-full bg-sale px-5 text-sm font-medium text-white disabled:opacity-60">
              {pending ? "Cancelling…" : "Yes, cancel order"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="h-10 cursor-pointer rounded-full px-4 text-sm hover:bg-white">
              Keep my order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

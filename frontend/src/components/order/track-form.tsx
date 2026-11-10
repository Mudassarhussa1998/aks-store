"use client";

import { useState, useTransition } from "react";

import { trackOrder } from "@/app/actions/shop";
import type { Order } from "@/lib/types";

import { OrderActions } from "./order-actions";
import { OrderDetails } from "./order-details";

export function TrackForm() {
  const [order, setOrder] = useState<Order | null>(null);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-8">
      <form
        action={(form) =>
          start(async () => {
            const typedPhone = String(form.get("phone") ?? "");
            const res = await trackOrder(String(form.get("number") ?? ""), typedPhone);
            setOrder(res.ok ? res.data : null);
            setPhone(typedPhone);
            setError(res.ok ? null : res.error);
          })
        }
        className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Order number
          <input name="number" required placeholder="RWJ-XXXXXX" className="h-12 rounded-xl border border-line-strong px-3.5 font-normal uppercase outline-none focus:border-forest focus:ring-4 focus:ring-forest/10" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Mobile number
          <input name="phone" type="tel" required placeholder="03XX XXXXXXX" className="h-12 rounded-xl border border-line-strong px-3.5 font-normal outline-none focus:border-forest focus:ring-4 focus:ring-forest/10" />
        </label>
        <button disabled={pending} className="h-12 cursor-pointer rounded-full bg-forest px-7 font-medium text-white disabled:opacity-60">
          {pending ? "Looking…" : "Track"}
        </button>
      </form>
      {error && (
        <p role="alert" className="rounded-xl bg-sale-soft px-4 py-3 text-sm text-sale">
          {error}
        </p>
      )}
      {order && (
        <div className="animate-rise rounded-3xl border border-line p-6">
          <OrderDetails order={order} actions={<OrderActions order={order} phone={phone} onChange={setOrder} />} />
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { rs } from "@/lib/format";
import type { Order } from "@/lib/types";

import { LAST_ORDER_KEY } from "../cart/checkout-form";
import { CheckIcon } from "../ui/icons";

const noop = () => () => {};

export function OrderSuccess() {
  const raw = useSyncExternalStore(
    noop,
    () => {
      try {
        return sessionStorage.getItem(LAST_ORDER_KEY);
      } catch {
        return null;
      }
    },
    () => undefined,
  );
  if (raw === undefined) return <div className="h-64 animate-pulse rounded-xl bg-sand" />;
  const order = raw ? (JSON.parse(raw) as Order) : null;

  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
      <div className="flex h-16 w-16 animate-fade items-center justify-center rounded-full bg-[#E3EEE8] text-ok">
        <CheckIcon size={30} />
      </div>
      <h1 className="tracking-tight text-4xl font-semibold">Thank you, your order is placed</h1>
      {order ? (
        <p className="text-base leading-relaxed text-body">
          Order <strong className="text-ink">#{order.number}</strong> · Total {rs(order.total)} to pay in cash on delivery.
          <br />
          We&apos;ll call you on {order.phone} to confirm before dispatch. Keep your order number to track it.
        </p>
      ) : (
        <p className="text-base text-body">We&apos;ll call you to confirm before dispatch.</p>
      )}
      <div className="grid w-full gap-4 rounded-lg bg-sand p-5 text-left text-sm sm:grid-cols-3">
        {[
          ["1. Confirmation call", "Within a few hours"],
          ["2. Dispatched", "Tracking number by SMS"],
          ["3. Pay at door", "2–4 working days"],
        ].map(([t, d]) => (
          <div key={t}>
            <div className="font-semibold">{t}</div>
            <div className="text-body">{d}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/track" className="rounded bg-forest px-7 py-3.5 font-medium text-white hover:text-white">
          Track my order
        </Link>
        <Link href="/" className="rounded border border-ink px-7 py-3.5 font-medium">
          Continue shopping
        </Link>
      </div>
    </section>
  );
}

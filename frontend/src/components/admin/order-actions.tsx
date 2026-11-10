"use client";

import { useState, useTransition } from "react";

import { updateOrderStatus } from "@/app/actions/admin";
import { STATUS_LABEL } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

import { inputClass, labelClass } from "./ui";

// Mirrors services/orders.py TRANSITIONS on the API.
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

const DANGER = new Set<OrderStatus>(["cancelled", "returned"]);

export function OrderActions({ number, status, courier, tracking }: {
  number: string;
  status: OrderStatus;
  courier: string | null;
  tracking: string | null;
}) {
  const options = NEXT[status];
  const [target, setTarget] = useState<OrderStatus | null>(options[0] ?? null);
  const [note, setNote] = useState("");
  const [courierName, setCourierName] = useState(courier ?? "");
  const [trackingNo, setTrackingNo] = useState(tracking ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!options.length) return <p className="text-sm text-muted">This order is {STATUS_LABEL[status].toLowerCase()}; no further changes.</p>;

  const submit = () => {
    if (!target) return;
    if (DANGER.has(target) && !confirm(`Mark ${number} as ${STATUS_LABEL[target].toLowerCase()}? Stock will be put back.`)) return;
    setError(null);
    start(async () => {
      const res = await updateOrderStatus(number, {
        status: target,
        note,
        ...(target === "shipped" ? { courier: courierName || null, tracking_number: trackingNo || null } : {}),
      });
      if (!res.ok) setError(res.error);
      else setNote("");
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-2 text-sm font-medium">Move to</legend>
        {options.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={target === s}
            onClick={() => setTarget(s)}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${
              target === s ? (DANGER.has(s) ? "border-sale bg-sale text-white" : "border-forest bg-forest text-white") : "border-line-strong bg-white"
            }`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </fieldset>
      {target === "shipped" && (
        <>
          <label className={labelClass}>
            Courier
            <input className={inputClass} value={courierName} onChange={(e) => setCourierName(e.target.value)} placeholder="TCS, Leopards, M&P…" />
          </label>
          <label className={labelClass}>
            Tracking number
            <input className={inputClass} value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} />
          </label>
        </>
      )}
      <label className={labelClass}>
        Note (optional)
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Confirmed on call" />
      </label>
      {error && <p role="alert" className="text-sm text-sale">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={pending || !target}
        className="rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : `Mark as ${target ? STATUS_LABEL[target].toLowerCase() : "…"}`}
      </button>
    </div>
  );
}

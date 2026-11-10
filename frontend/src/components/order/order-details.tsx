import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { date, rs, STATUS_LABEL } from "@/lib/format";
import type { Order } from "@/lib/types";

const FLOW = ["pending", "confirmed", "shipped", "delivered"] as const;

export const STATUS_STYLE: Record<string, string> = {
  pending: "bg-[#FBEFD9] text-[#7A4E0B]",
  confirmed: "bg-[#E4ECF5] text-[#23466E]",
  shipped: "bg-[#E9E4F3] text-[#4A3577]",
  delivered: "bg-[#E3EEE8] text-[#1E5A3E]",
  cancelled: "bg-[#F1ECE4] text-[#5A4A2E]",
  returned: "bg-[#F1ECE4] text-[#5A4A2E]",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-2.5 py-1.5 text-[13px] font-semibold ${STATUS_STYLE[status] ?? ""}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function OrderTimeline({ order }: { order: Order }) {
  if (order.status === "cancelled" || order.status === "returned") {
    return <p className="text-sm text-body">This order was {order.status}.</p>;
  }
  const reached = FLOW.indexOf(order.status as (typeof FLOW)[number]);
  return (
    <ol aria-label="Order progress" className="grid grid-cols-4 gap-2">
      {FLOW.map((s, i) => {
        const event = order.events.find((e) => e.status === s);
        return (
          <li key={s} className="flex flex-col gap-2 text-[13px]">
            <span className={`h-1 rounded-full ${i <= reached ? "bg-forest" : "bg-line"}`} />
            <span className="font-semibold">{STATUS_LABEL[s]}</span>
            <span className="text-muted">{event ? date(event.created_at) : i === reached + 1 ? "Next" : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderDetails({ order, actions }: { order: Order; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">#{order.number}</div>
          <div className="text-sm text-muted">
            Placed {date(order.created_at)} · Cash on Delivery · {rs(order.total)}
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <OrderTimeline order={order} />
      {actions}
      {order.tracking_number && (
        <p className="text-sm text-body">
          Courier: {order.courier ?? "—"} · Tracking {order.tracking_number}
        </p>
      )}
      <ul className="flex flex-col gap-3 border-t border-line pt-5">
        {order.items.map((i) => (
          <li key={i.sku} className="flex items-center gap-3.5">
            <Link href={`/p/${i.product_slug}`} className="relative h-[70px] w-14 shrink-0 overflow-hidden rounded-lg bg-mist">
              {i.image_url && <Image src={i.image_url} alt="" fill sizes="56px" className="object-cover" />}
            </Link>
            <span className="min-w-0 flex-1 text-sm">
              <Link href={`/p/${i.product_slug}`} className="block font-medium">
                {i.product_name}
              </Link>
              <span className="text-muted">
                {i.variant_label} · ×{i.quantity}
              </span>
              {order.status === "delivered" && (
                <Link href={`/p/${i.product_slug}#reviews`} className="mt-1 block text-[13px] font-medium text-forest hover:underline">
                  ★ Write a review
                </Link>
              )}
            </span>
            <span className="text-sm font-semibold">{rs(i.unit_price * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <dl className="grid gap-2 border-t border-line pt-5 text-sm">
        <Row k="Subtotal" v={rs(order.subtotal)} />
        {order.discount > 0 && <Row k={`Discount (${order.coupon_code})`} v={`− ${rs(order.discount)}`} />}
        <Row k="Delivery" v={order.delivery_fee ? rs(order.delivery_fee) : "Free"} />
        <Row k={order.status === "cancelled" || order.status === "returned" ? "Total" : order.status === "delivered" ? "Total paid" : "Total to pay on delivery"} v={rs(order.total)} strong />
      </dl>
      <div className="rounded-2xl bg-mist p-4 text-sm leading-relaxed">
        <strong className="font-semibold">Delivering to</strong>
        <br />
        {order.name} · {order.phone}
        <br />
        {order.address}, {order.area && `${order.area}, `}
        {order.city}
      </div>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-base font-semibold" : ""}`}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

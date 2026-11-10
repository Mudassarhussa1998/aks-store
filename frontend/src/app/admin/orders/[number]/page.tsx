import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { OrderActions } from "@/components/admin/order-actions";
import { adminApi } from "@/components/admin/server";
import { Card, StatusBadge, TableSkeleton } from "@/components/admin/ui";
import { ApiError } from "@/lib/api";
import { date, rs, STATUS_LABEL } from "@/lib/format";
import type { Order } from "@/lib/types";

export default function OrderPage({ params }: PageProps<"/admin/orders/[number]">) {
  return (
    <>
      <Link href="/admin/orders" className="mb-4 inline-block text-sm underline">
        ← All orders
      </Link>
      <Suspense fallback={<TableSkeleton />}>
        <OrderDetail params={params} />
      </Suspense>
    </>
  );
}

async function OrderDetail({ params }: Pick<PageProps<"/admin/orders/[number]">, "params">) {
  const { number } = await params;
  let order: Order;
  try {
    order = await adminApi<Order>(`/orders/${encodeURIComponent(number)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold">
            {order.number} <StatusBadge status={order.status} />
          </h1>
          <p className="mt-1 text-sm text-muted">
            Placed {date(order.created_at)} · Cash on Delivery · {rs(order.total)} to collect
          </p>
        </div>
        <a href={`tel:${order.phone.replace(/\s/g, "")}`} className="rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-white">
          Call {order.phone}
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <Card title={`Items (${order.items.reduce((n, i) => n + i.quantity, 0)})`}>
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.sku} className="flex items-center gap-4 px-5 py-4">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded bg-mist">
                    {item.image_url && <Image src={item.image_url} alt="" fill sizes="56px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <Link href={`/p/${item.product_slug}`} className="font-medium hover:underline">
                      {item.product_name}
                    </Link>
                    <div className="text-muted">
                      {item.variant_label} · SKU {item.sku}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold">{rs(item.unit_price * item.quantity)}</div>
                    <div className="text-muted">
                      {item.quantity} × {rs(item.unit_price)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="grid gap-2 border-t border-line px-5 py-4 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{rs(order.subtotal)}</dd></div>
              {order.discount > 0 && (
                <div className="flex justify-between text-ok"><dt>Discount {order.coupon_code && `(${order.coupon_code})`}</dt><dd>−{rs(order.discount)}</dd></div>
              )}
              <div className="flex justify-between"><dt>Delivery</dt><dd>{order.delivery_fee ? rs(order.delivery_fee) : "Free"}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total (COD)</dt><dd>{rs(order.total)}</dd></div>
            </dl>
          </Card>

          <Card title="Timeline">
            <ol className="flex flex-col gap-4 px-5 py-4">
              {order.events.map((e, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-forest" />
                  <div>
                    <div className="font-semibold">{STATUS_LABEL[e.status]}</div>
                    <div className="text-muted">
                      {new Date(e.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                      {e.note && ` · ${e.note}`}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Update status">
            <div className="p-5">
              <OrderActions key={order.status} number={order.number} status={order.status} courier={order.courier} tracking={order.tracking_number} />
            </div>
          </Card>
          <Card title="Customer">
            <div className="flex flex-col gap-1 px-5 py-4 text-sm">
              <span className="font-semibold">{order.name}</span>
              <span>{order.phone}</span>
              {order.email && <span className="text-muted">{order.email}</span>}
              <span className="mt-3 font-semibold">Delivery address</span>
              <span>{order.address}</span>
              <span>{[order.area, order.city].filter(Boolean).join(", ")}</span>
              {order.note && (
                <>
                  <span className="mt-3 font-semibold">Customer note</span>
                  <span>{order.note}</span>
                </>
              )}
              {(order.courier || order.tracking_number) && (
                <>
                  <span className="mt-3 font-semibold">Courier</span>
                  <span>
                    {order.courier} {order.tracking_number && `· ${order.tracking_number}`}
                  </span>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

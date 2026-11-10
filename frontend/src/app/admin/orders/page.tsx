import Link from "next/link";
import { Suspense } from "react";

import { OrdersTable } from "@/components/admin/orders-table";
import { adminApi } from "@/components/admin/server";
import { Card, inputClass, PageHeader, TableSkeleton } from "@/components/admin/ui";
import { STATUS_LABEL } from "@/lib/format";
import type { OrderSummary } from "@/lib/types";

const TABS = ["", "pending", "confirmed", "shipped", "delivered", "cancelled", "returned"];

export default function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <>
      <PageHeader title="Orders" subtitle="Cash on Delivery orders, newest first" />
      <Suspense fallback={<TableSkeleton />}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Orders({ searchParams }: Pick<PageProps<"/admin/orders">, "searchParams">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const q = typeof sp.q === "string" ? sp.q : "";
  const orders = await adminApi<OrderSummary[]>("/orders", { status: status || undefined, q: q || undefined });

  return (
    <Card
      actions={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <nav aria-label="Filter by status" className="flex flex-wrap gap-1.5 text-sm">
            {TABS.map((t) => (
              <Link
                key={t || "all"}
                href={t ? `/admin/orders?status=${t}` : "/admin/orders"}
                aria-current={t === status ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 ${t === status ? "bg-forest text-white" : "bg-[#F1EEE8] hover:bg-line"}`}
              >
                {t ? STATUS_LABEL[t] : "All"}
              </Link>
            ))}
          </nav>
          <form className="flex gap-2" action="/admin/orders">
            {status && <input type="hidden" name="status" value={status} />}
            <label className="sr-only" htmlFor="order-q">
              Search orders
            </label>
            <input id="order-q" name="q" defaultValue={q} placeholder="Order no., name or phone" className={`${inputClass} w-56`} />
            <button className="rounded-full bg-ink px-5 text-sm font-medium text-white">Search</button>
          </form>
        </div>
      }
    >
      <OrdersTable orders={orders} />
    </Card>
  );
}

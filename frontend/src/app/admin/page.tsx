import Link from "next/link";
import { Suspense } from "react";

import { OrdersTable } from "@/components/admin/orders-table";
import { adminApi } from "@/components/admin/server";
import type { Stats } from "@/components/admin/types";
import { ButtonLink, Card, PageHeader, TableSkeleton } from "@/components/admin/ui";
import { rs } from "@/lib/format";
import type { OrderSummary } from "@/lib/types";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Today at a glance"
        actions={
          <>
            <ButtonLink href="/admin/orders?status=pending">Orders to confirm</ButtonLink>
            <ButtonLink href="/admin/products/new" primary>
              + Add product
            </ButtonLink>
          </>
        }
      />
      <Suspense fallback={<TableSkeleton rows={2} />}>
        <StatTiles />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <PendingOrders />
      </Suspense>
    </>
  );
}

async function StatTiles() {
  const s = await adminApi<Stats>("/stats");
  const diff = s.orders_today - s.orders_yesterday;
  const tiles = [
    { label: "Orders today", value: String(s.orders_today), note: `${diff >= 0 ? "+" : ""}${diff} vs. yesterday`, tone: diff >= 0 ? "text-ok" : "text-sale", href: "/admin/orders" },
    { label: "Waiting for confirmation", value: String(s.pending_orders), note: "Call customers to confirm COD", tone: "text-[#7A4E0B]", href: "/admin/orders?status=pending" },
    { label: "Revenue this month", value: rs(s.revenue_month), note: "Delivered orders only", tone: "text-muted", href: "/admin/orders?status=delivered" },
    { label: "Low stock variants", value: String(s.low_stock_variants), note: "3 or fewer left", tone: "text-sale", href: "/admin/inventory" },
    { label: "Customers", value: String(s.customers), note: "Registered accounts", tone: "text-muted", href: "/admin/customers" },
    { label: "Hidden reviews", value: String(s.pending_reviews), note: "Unpublished", tone: "text-muted", href: "/admin/reviews" },
  ];
  return (
    <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
      {tiles.map((t) => (
        <Link key={t.label} href={t.href} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-5 hover:border-line-strong">
          <span className="text-sm text-muted">{t.label}</span>
          <span className="text-3xl font-semibold">{t.value}</span>
          <span className={`text-sm ${t.tone}`}>{t.note}</span>
        </Link>
      ))}
    </div>
  );
}

async function PendingOrders() {
  const orders = await adminApi<OrderSummary[]>("/orders", { status: "pending" });
  return (
    <Card title="Orders to confirm (COD)" actions={<Link href="/admin/orders" className="text-sm underline">All orders</Link>}>
      <OrdersTable orders={orders.slice(0, 10)} empty="No orders waiting. Nice work." />
    </Card>
  );
}

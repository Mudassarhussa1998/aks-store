import Link from "next/link";

import { date, rs } from "@/lib/format";
import type { OrderSummary } from "@/lib/types";

import { StatusBadge, td, th } from "./ui";

export function OrdersTable({ orders, empty = "No orders found." }: { orders: OrderSummary[]; empty?: string }) {
  if (!orders.length) return <p className="px-5 py-8 text-sm text-muted">{empty}</p>;
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr>
            <th className={th}>Order</th>
            <th className={th}>Customer</th>
            <th className={th}>City</th>
            <th className={th}>Items</th>
            <th className={th}>Total</th>
            <th className={th}>Status</th>
            <th className={th}>Placed</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.number} className="border-t border-line hover:bg-mist/50">
              <td className={td}>
                <Link href={`/admin/orders/${o.number}`} className="font-semibold underline-offset-2 hover:underline">
                  {o.number}
                </Link>
              </td>
              <td className={td}>
                {o.name}
                <div className="text-xs text-muted">{o.phone}</div>
              </td>
              <td className={td}>{o.city}</td>
              <td className={td}>{o.item_count}</td>
              <td className={`${td} font-semibold`}>{rs(o.total)}</td>
              <td className={td}>
                <StatusBadge status={o.status} />
              </td>
              <td className={`${td} text-muted`}>{date(o.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

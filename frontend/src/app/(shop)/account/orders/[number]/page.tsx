import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { OrderActions } from "@/components/order/order-actions";
import { OrderDetails } from "@/components/order/order-details";
import { api, ApiError } from "@/lib/api";
import { getToken } from "@/lib/session";
import type { Order } from "@/lib/types";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };

export default function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 pb-16">
      <Link href="/account" className="text-sm text-forest hover:underline">
        ← Back to my orders
      </Link>
      <div className="mt-6 rounded-3xl border border-line p-6">
        <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-mist" />}>
          {params.then(({ number }) => (
            <OrderForUser number={number} />
          ))}
        </Suspense>
      </div>
    </div>
  );
}

async function OrderForUser({ number }: { number: string }) {
  const token = await getToken();
  if (!token) redirect(`/login?next=/account/orders/${encodeURIComponent(number)}`);
  const order = await api<Order>(`/orders/${encodeURIComponent(number)}`, { token }).catch((e) => {
    if (e instanceof ApiError && (e.status === 404 || e.status === 401)) notFound();
    throw e;
  });
  return <OrderDetails order={order} actions={<OrderActions order={order} />} />;
}

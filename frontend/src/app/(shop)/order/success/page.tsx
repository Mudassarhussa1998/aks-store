import type { Metadata } from "next";

import { OrderSuccess } from "@/components/order/order-success";

export const metadata: Metadata = { title: "Order placed", robots: { index: false } };

export default function OrderSuccessPage() {
  return (
    <div className="px-4 pt-12 pb-16">
      <OrderSuccess />
    </div>
  );
}

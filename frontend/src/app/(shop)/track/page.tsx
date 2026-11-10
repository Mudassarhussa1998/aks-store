import type { Metadata } from "next";

import { TrackForm } from "@/components/order/track-form";

export const metadata: Metadata = { title: "Track your order" };

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-16">
      <h1 className="tracking-tight text-4xl font-semibold">
        Track your order
      </h1>
      <p className="mt-2 mb-8 text-body">Enter your order number and the mobile number you used at checkout.</p>
      <TrackForm />
    </div>
  );
}

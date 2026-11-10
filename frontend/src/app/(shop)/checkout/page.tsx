import type { Metadata } from "next";
import { Suspense } from "react";

import { CheckoutForm } from "@/components/cart/checkout-form";
import { api } from "@/lib/api";
import { getCurrentUser, getToken } from "@/lib/session";
import type { Address } from "@/lib/types";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-16">
      <h1 className="tracking-tight mb-7 text-4xl font-semibold">Checkout</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-sand" />}>
        <CheckoutForUser />
      </Suspense>
    </div>
  );
}

async function CheckoutForUser() {
  const user = await getCurrentUser();
  const token = user ? await getToken() : null;
  const addresses = token ? await api<Address[]>("/me/addresses", { token }).catch(() => []) : [];
  return <CheckoutForm user={user} addresses={addresses} />;
}

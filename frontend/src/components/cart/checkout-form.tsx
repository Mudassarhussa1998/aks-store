"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { placeOrder } from "@/app/actions/shop";
import { CITIES, phone, rs } from "@/lib/format";
import type { Address, User } from "@/lib/types";

import { useCart } from "./cart-store";
import { SummaryRows } from "./order-summary";
import { readCoupon, saveCoupon, useQuote } from "./use-quote";

export const LAST_ORDER_KEY = "aks_last_order";

const input = "rounded border border-line-strong px-3 py-3 font-normal";
const label = "flex flex-col gap-1.5 text-sm font-medium";

export function CheckoutForm({ user, addresses }: { user: User | null; addresses: Address[] }) {
  const router = useRouter();
  const cart = useCart();
  const [coupon] = useState(readCoupon);
  const { quote } = useQuote(coupon);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0];
  const [addressId, setAddressId] = useState<number | "new">(defaultAddress?.id ?? "new");
  const chosen = addresses.find((a) => a.id === addressId);

  if (!cart.ready) return <div className="h-96 animate-pulse rounded-xl bg-sand" />;
  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl bg-sand px-6 py-14 text-center">
        <p className="text-lg">Your cart is empty.</p>
        <Link href="/" className="rounded bg-forest px-7 py-3.5 font-medium text-white hover:text-white">
          Continue shopping
        </Link>
      </div>
    );
  }

  const blocked = !quote || quote.lines.some((l) => !l.available) || quote.lines.length === 0;

  const submit = (form: FormData) =>
    start(async () => {
      setError(null);
      const get = (k: string) => String(form.get(k) ?? "").trim();
      const res = await placeOrder({
        items: cart.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
        coupon: quote?.coupon ?? null,
        name: chosen?.name ?? get("name"),
        phone: chosen?.phone ?? get("phone"),
        email: get("email") || undefined,
        city: chosen?.city ?? get("city"),
        area: chosen?.area ?? get("area"),
        address: chosen?.line ?? get("address"),
        note: get("note"),
        save_address: !chosen && form.get("save_address") === "on",
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      try {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(res.data));
      } catch {
        // the success page falls back to account/track links
      }
      saveCoupon("");
      cart.clear();
      router.push("/order/success");
    });

  return (
    <form action={submit} className="flex flex-wrap items-start gap-12">
      <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-8">
        {!user && (
          <div className="flex flex-wrap justify-between gap-3 rounded-lg bg-sand px-4 py-3.5 text-sm">
            <span>Have an account? Sign in to track orders and save addresses.</span>
            <Link href="/login?next=/checkout" className="font-semibold underline">
              Sign in
            </Link>
          </div>
        )}

        {addresses.length > 0 && (
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-4 text-lg font-semibold">Deliver to</legend>
            {addresses.map((a) => (
              <label key={a.id} className={`flex cursor-pointer gap-3.5 rounded-lg p-4 ${addressId === a.id ? "border-2 border-forest bg-sand" : "border border-line"}`}>
                <input type="radio" name="address_choice" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1 accent-forest" />
                <span className="text-sm leading-relaxed">
                  <strong className="font-semibold">{a.label}</strong> · {a.name} · {a.phone}
                  <br />
                  {a.line}, {a.area && `${a.area}, `}
                  {a.city}
                </span>
              </label>
            ))}
            <label className={`flex cursor-pointer gap-3.5 rounded-lg p-4 ${addressId === "new" ? "border-2 border-forest bg-sand" : "border border-line"}`}>
              <input type="radio" name="address_choice" checked={addressId === "new"} onChange={() => setAddressId("new")} className="accent-forest" />
              <span className="text-sm font-medium">Use a new address</span>
            </label>
          </fieldset>
        )}

        {!chosen && (
          <>
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-4 text-lg font-semibold">Contact</legend>
              <label className={label}>
                Full name
                <input name="name" required minLength={2} autoComplete="name" defaultValue={user?.name} className={input} />
              </label>
              <label className={label}>
                Mobile number
                <input name="phone" type="tel" required autoComplete="tel" placeholder="03XX XXXXXXX" pattern="(\+92|0)3\d{2}[\s\-]?\d{7}" title="A Pakistani mobile number, e.g. 0300 1234567" defaultValue={phone(user?.phone)} className={input} />
              </label>
              <label className={`${label} sm:col-span-2`}>
                Email (optional, for order updates)
                <input name="email" type="email" autoComplete="email" defaultValue={user?.email} className={input} />
              </label>
            </fieldset>
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-4 text-lg font-semibold">Delivery address</legend>
              <label className={label}>
                City
                <input name="city" required list="cities" autoComplete="address-level2" placeholder="e.g. Lahore" className={input} />
                <datalist id="cities">
                  {CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
              <label className={label}>
                Area / Sector
                <input name="area" placeholder="e.g. DHA Phase 5" className={input} />
              </label>
              <label className={`${label} sm:col-span-2`}>
                Full address
                <textarea name="address" required minLength={5} rows={3} autoComplete="street-address" placeholder="House no., street, nearest landmark" className={input} />
              </label>
              {user && (
                <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
                  <input type="checkbox" name="save_address" defaultChecked className="h-4 w-4 accent-forest" /> Save this address to my account
                </label>
              )}
            </fieldset>
          </>
        )}

        <label className={label}>
          Order note (optional)
          <input name="note" maxLength={500} placeholder="e.g. Call before arriving" className={input} />
        </label>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-4 text-lg font-semibold">Payment</legend>
          <label className="flex cursor-pointer items-start gap-3.5 rounded-lg border-2 border-forest bg-sand p-4">
            <input type="radio" name="payment" defaultChecked className="mt-1 accent-forest" />
            <span>
              <span className="block font-semibold">Cash on Delivery</span>
              <span className="mt-0.5 block text-sm text-body">Pay in cash when your order arrives.</span>
            </span>
          </label>
          <label className="flex items-start gap-3.5 rounded-lg border border-line p-4 text-[#6B6B6B]">
            <input type="radio" name="payment" disabled className="mt-1" />
            <span>
              <span className="block font-semibold">Card, JazzCash, Easypaisa</span>
              <span className="mt-0.5 block text-sm">Coming soon</span>
            </span>
          </label>
        </fieldset>
      </div>

      <aside aria-label="Order summary" className="flex w-full flex-[1_1_320px] flex-col gap-4 rounded-xl bg-sand p-7 lg:sticky lg:top-24 lg:max-w-[400px]">
        <h2 className="text-lg font-semibold">Order summary</h2>
        {cart.items.map((i) => (
          <div key={i.variantId} className="flex items-center gap-3.5">
            <span className="relative h-[70px] w-14 shrink-0 overflow-hidden rounded bg-line">
              {i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />}
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <span className="block font-medium">{i.name}</span>
              <span className="text-muted">
                {i.label} · ×{i.quantity}
              </span>
            </span>
            <span className="text-sm font-semibold">{rs(i.price * i.quantity)}</span>
          </div>
        ))}
        <div className="flex flex-col gap-2.5 border-t border-[#DDD6CA] pt-4">
          <SummaryRows quote={quote} />
        </div>
        {error && (
          <p role="alert" className="rounded bg-sale-soft px-3 py-2.5 text-sm text-sale">
            {error}
          </p>
        )}
        {quote?.lines.some((l) => !l.available) && (
          <p className="text-sm text-sale">
            Some items are out of stock. <Link href="/cart" className="underline">Update your cart</Link>
          </p>
        )}
        <button disabled={pending || blocked} className="min-h-[52px] cursor-pointer rounded bg-forest text-[15px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
          {pending ? "Placing order…" : quote ? `Place order · ${rs(quote.total)}` : "Place order"}
        </button>
        <span className="text-center text-[13px] text-body">You pay in cash when the parcel arrives.</span>
      </aside>
    </form>
  );
}

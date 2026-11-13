import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { logout } from "@/app/actions/auth";
import { AddressBook } from "@/components/account/address-book";
import { MyReviews } from "@/components/account/my-reviews";
import { ProfileForm } from "@/components/account/profile-form";
import { StatusBadge } from "@/components/order/order-details";
import { ProductGrid } from "@/components/product/product-card";
import { BagIcon, ClockIcon, HeartIcon, LogoutIcon, PinIcon, StarIcon, UserIcon } from "@/components/ui/icons";
import { api } from "@/lib/api";
import { date, phone, rs } from "@/lib/format";
import { getCurrentUser, getToken } from "@/lib/session";
import type { Address, OrderSummary, ProductCard, Review, User } from "@/lib/types";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

const TABS = [
  ["orders", "My orders", BagIcon],
  ["wishlist", "Wishlist", HeartIcon],
  ["reviews", "My reviews", StarIcon],
  ["addresses", "Addresses", PinIcon],
  ["recent", "Recently viewed", ClockIcon],
  ["profile", "Profile", UserIcon],
] as const;
type Tab = (typeof TABS)[number][0];

export default function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string; reset?: string }> }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-16">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-sand" />}>
        {searchParams.then(({ tab, reset }) => (
          <Account tab={(TABS.find(([id]) => id === tab)?.[0] ?? "orders") as Tab} reset={reset === "1"} />
        ))}
      </Suspense>
    </div>
  );
}

async function Account({ tab, reset }: { tab: Tab; reset: boolean }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/account?tab=${tab}`)}`);
  const token = (await getToken())!;
  const phoneUnverified = user.can_verify_phone && !user.phone_verified;

  return (
    <>
      <h1 className="mb-8 text-3xl font-semibold md:text-4xl">Assalam-o-Alaikum, {user.name.split(" ")[0]}</h1>
      {!user.phone && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-mist px-5 py-4">
          <p className="text-[15px]">
            <strong className="font-semibold">Add your mobile number.</strong>{" "}
            <span className="text-muted">Couriers need it to deliver Cash on Delivery orders.</span>
          </p>
          <Link href="/complete-profile?next=/account" className="rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-white hover:text-white">
            Add number
          </Link>
        </div>
      )}
      {user.phone && (!user.email_verified || phoneUnverified) && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-mist px-5 py-4">
          <p className="text-[15px]">
            <strong className="font-semibold">
              Verify your {!user.email_verified && phoneUnverified ? "email and mobile number" : !user.email_verified ? "email" : "mobile number"}.
            </strong>{" "}
            <span className="text-muted">It keeps your account safe and lets you reset your password.</span>
          </p>
          <Link href="/verify?next=/account" className="rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-white hover:text-white">
            Verify now
          </Link>
        </div>
      )}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
        <aside className="lg:sticky lg:top-24 lg:w-64 lg:shrink-0">
          <div className="mb-3 hidden items-center gap-3 rounded-2xl bg-mist p-4 lg:flex">
            <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest text-[15px] font-semibold text-white">
              {initials(user.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold">{user.name}</span>
              <span className="block truncate text-[13px] text-muted">{user.email}</span>
            </span>
          </div>
          <nav aria-label="Account" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
            {TABS.map(([id, label, Icon]) => (
              <Link
                key={id}
                href={`/account?tab=${id}`}
                aria-current={tab === id ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-full border px-4 py-2 text-[15px] lg:rounded-xl lg:border-0 lg:py-2.5 ${
                  tab === id ? "border-forest bg-forest text-white lg:bg-mist lg:font-semibold lg:text-ink" : "border-line-strong hover:bg-mist"
                }`}
              >
                <Icon size={19} className="hidden lg:block" />
                {label}
              </Link>
            ))}
            <form action={logout} className="shrink-0 lg:mt-2 lg:border-t lg:border-line lg:pt-2">
              <button className="flex w-full cursor-pointer items-center gap-3 rounded-full border border-line-strong px-4 py-2 text-[15px] text-sale lg:rounded-xl lg:border-0 lg:py-2.5 lg:hover:bg-sale-soft">
                <LogoutIcon size={19} className="hidden lg:block" />
                Sign out
              </button>
            </form>
          </nav>
        </aside>
        <section className="min-w-0 flex-1">
          <TabContent tab={tab} token={token} user={user} reset={reset} />
        </section>
      </div>
    </>
  );
}

async function TabContent({ tab, token, user, reset }: { tab: Tab; token: string; user: User; reset: boolean }) {
  const h2 = "mb-5 text-[22px] font-semibold";
  switch (tab) {
    case "orders": {
      const orders = await api<OrderSummary[]>("/orders", { token });
      return (
        <>
          <h2 className={h2}>My orders</h2>
          {orders.length === 0 ? (
            <Empty text="You haven't placed an order yet." />
          ) : (
            <div className="flex flex-col gap-4">
              {orders.map((o) => (
                <Link key={o.number} href={`/account/orders/${o.number}`} className="lift flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-6 py-5">
                  <div>
                    <div className="text-base font-semibold">#{o.number}</div>
                    <div className="text-sm text-muted">
                      {date(o.created_at)} · {o.item_count} {o.item_count === 1 ? "item" : "items"} · {rs(o.total)}
                    </div>
                  </div>
                  <StatusBadge status={o.status} />
                </Link>
              ))}
            </div>
          )}
        </>
      );
    }
    case "wishlist": {
      const items = await api<ProductCard[]>("/me/wishlist", { token });
      return (
        <>
          <h2 className={h2}>Wishlist ({items.length})</h2>
          {items.length ? <ProductGrid products={items} /> : <Empty text="Tap the heart on any product to save it here." />}
        </>
      );
    }
    case "recent": {
      const items = await api<ProductCard[]>("/me/recent", { token });
      return (
        <>
          <h2 className={h2}>Recently viewed</h2>
          {items.length ? <ProductGrid products={items} /> : <Empty text="Products you look at will show up here." />}
        </>
      );
    }
    case "reviews": {
      const reviews = await api<Review[]>("/me/reviews", { token });
      return (
        <>
          <h2 className={h2}>My reviews</h2>
          {reviews.length === 0 ? (
            <Empty text="After your order is delivered, you can review it from the order page or the product page." />
          ) : (
            <MyReviews reviews={reviews} />
          )}
        </>
      );
    }
    case "addresses": {
      const addresses = await api<Address[]>("/me/addresses", { token });
      return (
        <>
          <h2 className={h2}>Saved addresses</h2>
          <AddressBook addresses={addresses} defaults={{ name: user.name, phone: phone(user.phone) }} />
        </>
      );
    }
    case "profile":
      return (
        <>
          <h2 className={h2}>Profile</h2>
          <ProfileForm user={user} notice={reset ? "Your password has been reset and you're signed in." : undefined} />
        </>
      );
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-3xl bg-mist px-6 py-10 text-center">
      <p className="text-body">{text}</p>
      <Link href="/" className="mt-4 inline-block text-sm font-medium underline">
        Start shopping
      </Link>
    </div>
  );
}

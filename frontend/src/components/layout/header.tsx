import Link from "next/link";
import { Suspense } from "react";

import { getCategories } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/session";

import { Logo } from "../brand/logo";
import { HeartIcon, UserIcon } from "../ui/icons";
import { CartButton } from "./cart-button";
import { MobileMenu } from "./mobile-menu";
import { SearchBox } from "./search-box";

export async function Header() {
  const categories = await getCategories();
  const nav = categories.map((c) => ({ href: `/c/${c.slug}`, label: c.name }));

  return (
    <>
      <div className="bg-forest px-4 py-2 text-center text-[13px] text-sand">
        Cash on Delivery across Pakistan · Free delivery on orders over Rs 3,000
      </div>
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-x-3 px-4 py-3 sm:gap-x-8">
          <MobileMenu categories={categories.map((c) => ({ slug: c.slug, name: c.name, children: c.children.map(({ slug, name }) => ({ slug, name })) }))} />
          <Logo />
          <nav aria-label="Main" className="hidden flex-1 flex-wrap gap-x-6 gap-y-1 text-sm font-medium lg:flex">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="py-2 hover:text-forest">
                {n.label}
              </Link>
            ))}
            <Link href="/shop?sort=newest" className="py-2 text-sale">
              New in
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <SearchBox />
            <Suspense fallback={<AccountLinks signedIn={false} />}>
              <AccountLinksForUser />
            </Suspense>
            <CartButton />
          </div>
        </div>
      </header>
    </>
  );
}

async function AccountLinksForUser() {
  const user = await getCurrentUser();
  return <AccountLinks signedIn={!!user} isAdmin={!!user?.is_admin} />;
}

function AccountLinks({ signedIn, isAdmin }: { signedIn: boolean; isAdmin?: boolean }) {
  const iconLink = "flex h-11 w-11 items-center justify-center rounded-full hover:bg-mist";
  return (
    <>
      {isAdmin && (
        <Link href="/admin" className="hidden rounded-full border border-line px-3 py-1.5 text-xs font-semibold sm:block">
          Admin
        </Link>
      )}
      <Link href={signedIn ? "/account?tab=wishlist" : "/login?next=/account?tab=wishlist"} aria-label="Wishlist" className={`${iconLink} hidden sm:flex`}>
        <HeartIcon />
      </Link>
      <Link href={signedIn ? "/account" : "/login"} aria-label={signedIn ? "My account" : "Sign in"} className={iconLink}>
        <UserIcon />
      </Link>
    </>
  );
}

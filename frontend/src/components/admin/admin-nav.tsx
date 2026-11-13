"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import { createPortal } from "react-dom";

import { logout } from "@/app/actions/auth";

import { Mark } from "../brand/logo";

import {
  BagIcon,
  ChatIcon,
  CloseIcon,
  GridIcon,
  LayersIcon,
  LogoutIcon,
  MenuIcon,
  PackageIcon,
  StarIcon,
  StoreIcon,
  TagIcon,
  TicketIcon,
  UsersIcon,
} from "../ui/icons";

type Item = { href: string; label: string; Icon: ComponentType<{ size?: number; className?: string }> };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Sell",
    items: [
      { href: "/admin", label: "Dashboard", Icon: GridIcon },
      { href: "/admin/orders", label: "Orders", Icon: BagIcon },
    ],
  },
  {
    title: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", Icon: TagIcon },
      { href: "/admin/inventory", label: "Inventory", Icon: PackageIcon },
      { href: "/admin/categories", label: "Categories", Icon: LayersIcon },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/admin/customers", label: "Customers", Icon: UsersIcon },
      { href: "/admin/messages", label: "Messages", Icon: ChatIcon },
      { href: "/admin/reviews", label: "Reviews", Icon: StarIcon },
    ],
  },
  { title: "Marketing", items: [{ href: "/admin/coupons", label: "Coupons", Icon: TicketIcon }] },
];

function Logo() {
  return (
    <Link href="/admin" className="flex items-center gap-2 px-3">
      <Mark size={28} />
      <span className="text-lg font-semibold tracking-[0.12em]">VELENZAY</span>
      <span className="rounded-full bg-forest px-2 py-0.5 text-[11px] font-medium text-white">Admin</span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-col gap-5">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="px-3 pb-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">{g.title}</p>
          <ul className="flex flex-col gap-0.5">
            {g.items.map(({ href, label, Icon }) => {
              const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] transition-colors ${
                      active ? "bg-mist font-semibold text-forest" : "text-body hover:bg-mist hover:text-ink"
                    }`}
                  >
                    <Icon size={19} className={active ? "text-forest" : "text-muted"} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Footer() {
  return (
    <div className="flex flex-col gap-0.5 border-t border-line pt-3">
      <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] text-body hover:bg-mist">
        <StoreIcon size={19} className="text-muted" />
        View store
      </Link>
      <form action={logout}>
        <button className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-[15px] text-sale hover:bg-sale-soft">
          <LogoutIcon size={19} />
          Sign out
        </button>
      </form>
    </div>
  );
}

const noop = () => () => {};

/** Fixed sidebar on desktop; a top bar with a slide-in drawer on smaller screens. */
export function AdminSidebar() {
  const [open, setOpen] = useState(false);
  const isClient = useSyncExternalStore(noop, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-line bg-white px-3 py-5 lg:flex">
        <Logo />
        <div className="flex-1">
          <NavLinks />
        </div>
        <Footer />
      </aside>

      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-white/90 px-3 py-2 backdrop-blur lg:hidden">
        <button type="button" aria-label="Open admin menu" aria-expanded={open} onClick={() => setOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-mist">
          <MenuIcon />
        </button>
        <Logo />
      </header>

      {isClient &&
        createPortal(
          <div className={`fixed inset-0 z-50 lg:hidden ${open ? "visible" : "invisible"}`} role="dialog" aria-modal="true" aria-label="Admin menu">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
            />
            <div
              className={`relative flex h-full w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto bg-white px-3 py-4 shadow-xl transition-transform duration-300 ease-out ${
                open ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <div className="flex items-center justify-between">
                <Logo />
                <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-mist">
                  <CloseIcon />
                </button>
              </div>
              <div className="flex-1">
                <NavLinks onNavigate={() => setOpen(false)} />
              </div>
              <Footer />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { BagIcon, ChevronDown, ChevronRight, CloseIcon, HeartIcon, MenuIcon, PackageIcon, UserIcon } from "../ui/icons";

export type MenuCategory = {
  slug: string;
  name: string;
  children: { slug: string; name: string }[];
};

export function MobileMenu({ categories }: { categories: MenuCategory[] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Close on Escape and keep the page behind from scrolling while the drawer is open.
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

  const close = () => setOpen(false);
  // The header's backdrop blur would trap a fixed drawer inside it, so the drawer renders on <body>.
  const isClient = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="-ml-2 flex h-11 w-11 items-center justify-center"
      >
        <MenuIcon />
      </button>

      {isClient &&
        createPortal(
          <div
            className={`fixed inset-0 z-50 lg:hidden ${open ? "visible" : "invisible"}`}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            aria-hidden={!open}
          >
            <button
              type="button"
              tabIndex={-1}
              aria-label="Close menu"
              onClick={close}
              className={`absolute inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
            />
            <nav
              className={`relative flex h-full w-[340px] max-w-[88vw] flex-col bg-white shadow-xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <Link href="/" onClick={close} className="text-xl font-semibold tracking-[0.08em]">
                  AKS
                  <span className="text-xs tracking-normal text-muted">.pk</span>
                </Link>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={close}
                  className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-mist"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-4">
                <p className="px-3 pb-2 text-xs font-medium text-muted">Shop</p>
                <ul className="flex flex-col">
                  {categories.map((c) => {
                    const isOpen = expanded === c.slug;
                    return (
                      <li key={c.slug}>
                        <div className="flex items-center">
                          <Link href={`/c/${c.slug}`} onClick={close} className="flex-1 rounded-xl px-3 py-3 text-[17px] font-medium hover:bg-mist">
                            {c.name}
                          </Link>
                          {c.children.length > 0 && (
                            <button
                              type="button"
                              aria-label={`${isOpen ? "Hide" : "Show"} ${c.name} categories`}
                              aria-expanded={isOpen}
                              onClick={() => setExpanded(isOpen ? null : c.slug)}
                              className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-mist"
                            >
                              <ChevronDown className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                            </button>
                          )}
                        </div>
                        {isOpen && (
                          <ul className="mb-2 ml-3 flex flex-col border-l border-line pl-3">
                            {c.children.map((k) => (
                              <li key={k.slug}>
                                <Link href={`/c/${k.slug}`} onClick={close} className="block rounded-lg px-3 py-2.5 text-[15px] text-body hover:bg-mist">
                                  {k.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                  <li>
                    <Link
                      href="/shop?sort=newest"
                      onClick={close}
                      className="flex items-center justify-between rounded-xl px-3 py-3 text-[17px] font-medium text-sale hover:bg-mist"
                    >
                      New in
                      <ChevronRight size={14} />
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="border-t border-line px-3 py-3">
                {[
                  { href: "/account", label: "My account", Icon: UserIcon },
                  {
                    href: "/account?tab=orders",
                    label: "My orders",
                    Icon: BagIcon,
                  },
                  {
                    href: "/account?tab=wishlist",
                    label: "Wishlist",
                    Icon: HeartIcon,
                  },
                  {
                    href: "/track",
                    label: "Track my order",
                    Icon: PackageIcon,
                  },
                ].map(({ href, label, Icon }) => (
                  <Link key={href} href={href} onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] hover:bg-mist">
                    <Icon size={20} className="text-muted" />
                    {label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>,
          document.body,
        )}
    </div>
  );
}

const noop = () => () => {};

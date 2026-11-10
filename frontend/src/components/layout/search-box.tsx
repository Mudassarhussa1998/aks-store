"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { searchSuggest } from "@/app/actions/shop";
import { rs } from "@/lib/format";
import type { ProductCard } from "@/lib/types";

import { SearchIcon } from "../ui/icons";

export function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ProductCard[]>([]);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => searchSuggest(q).then(setResults), 180); // debounce typing
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const shown = q.trim().length >= 2 ? results : [];

  return (
    <div ref={box} className="relative">
      <Link href="/search" aria-label="Search" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-sand sm:hidden">
        <SearchIcon />
      </Link>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) {
            setOpen(false);
            router.push(`/search?q=${encodeURIComponent(q.trim())}`);
          }
        }}
        className="hidden w-56 items-center gap-2 rounded-full border border-line px-3 py-2 text-muted sm:flex"
      >
        <SearchIcon size={18} className="shrink-0" />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search towels, kurtas…"
          aria-label="Search products"
          aria-controls={listId}
          className="w-full bg-transparent text-sm text-ink outline-none"
        />
      </form>
      {open && shown.length > 0 && (
        <ul
          id={listId}
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-white shadow-xl"
        >
          {shown.map((p) => (
            <li key={p.id}>
              <Link
                href={`/p/${p.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 hover:bg-sand"
              >
                <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded bg-sand">
                  {p.image && <Image src={p.image} alt="" fill sizes="40px" className="object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted">{p.category}</span>
                </span>
                <span className="text-sm font-semibold">{rs(p.price)}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={`/search?q=${encodeURIComponent(q.trim())}`}
              onClick={() => setOpen(false)}
              className="block border-t border-line px-3 py-2.5 text-center text-sm font-medium underline"
            >
              See all results for “{q.trim()}”
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}

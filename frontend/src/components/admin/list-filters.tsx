"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { SearchIcon } from "../ui/icons";
import { inputClass } from "./ui";

export type FilterSelect = { name: string; label: string; options: { value: string; label: string }[] };

/** Search box plus dropdowns that rewrite the URL query; the server page re-renders with the new filters. */
export function ListFilters({ placeholder, selects }: { placeholder: string; selects: FilterSelect[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, start] = useTransition();

  const go = (changes: Record<string, string>) => {
    const qs = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) qs.set(k, v);
      else qs.delete(k);
    }
    qs.delete("page");
    start(() => router.push(`${pathname}?${qs.toString()}`, { scroll: false }));
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <form
        role="search"
        className="relative min-w-56 flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: q.trim() });
        }}
      >
        <SearchIcon size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={`${inputClass} pl-9`} />
      </form>
      {selects.map((s) => (
        <select
          key={s.name}
          aria-label={s.label}
          value={params.get(s.name) ?? ""}
          onChange={(e) => go({ [s.name]: e.target.value })}
          className={`${inputClass.replace("w-full ", "")} w-auto max-w-full cursor-pointer`}
        >
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}

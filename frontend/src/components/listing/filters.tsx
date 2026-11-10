"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { rs } from "@/lib/format";
import type { Facets } from "@/lib/types";

import { ChevronDown, CloseIcon, SlidersIcon } from "../ui/icons";

function useQueryUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = (mutate: (qs: URLSearchParams) => void) => {
    const qs = new URLSearchParams(params.toString());
    mutate(qs);
    qs.delete("page"); // any filter change starts again from page 1
    const s = qs.toString();
    startTransition(() => router.push(s ? `${pathname}?${s}` : pathname, { scroll: false }));
  };
  return { params, update, pending };
}

export function SortSelect({ value }: { value: string }) {
  const { update } = useQueryUpdater();
  return (
    <label className="flex items-center gap-2.5 text-sm text-muted">
      Sort by
      <select
        value={value}
        onChange={(e) => update((qs) => (e.target.value === "recommended" ? qs.delete("sort") : qs.set("sort", e.target.value)))}
        className="cursor-pointer rounded-full border border-line-strong bg-white px-4 py-2.5 text-sm"
      >
        <option value="recommended">Recommended</option>
        <option value="newest">Newest</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
        <option value="rating">Top rated</option>
      </select>
    </label>
  );
}

const FILTER_KEYS = ["size", "color", "quality", "min_price", "max_price", "min_rating"];

export function Filters({ facets, total }: { facets: Facets; total: number }) {
  const { params, update, pending } = useQueryUpdater();
  const [open, setOpen] = useState(false);
  const selected = (key: string) => params.getAll(key);
  const toggle = (key: string, value: string) =>
    update((qs) => {
      const current = qs.getAll(key);
      qs.delete(key);
      (current.includes(value) ? current.filter((v) => v !== value) : [...current, value]).forEach((v) => qs.append(key, v));
    });
  const activeCount = FILTER_KEYS.reduce((n, k) => n + selected(k).length, 0);
  const clearAll = () => update((qs) => FILTER_KEYS.forEach((k) => qs.delete(k)));

  // On phones the filters open as a panel: close on Escape and stop the page behind from scrolling.
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

  const check = "h-[18px] w-[18px] rounded accent-forest";
  return (
    <aside aria-label="Filters" className="w-full lg:sticky lg:top-24 lg:w-60 lg:shrink-0 lg:self-start">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-line-strong px-4 py-2.5 text-sm font-medium lg:hidden"
      >
        <SlidersIcon size={18} />
        Filters
        {activeCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-forest px-1.5 text-xs text-white">{activeCount}</span>}
      </button>

      <div className={`${open ? "fixed" : "hidden"} inset-0 z-50 flex justify-end lg:static lg:z-auto lg:block`}>
        <button type="button" tabIndex={-1} aria-label="Close filters" onClick={() => setOpen(false)} className="absolute inset-0 animate-fade bg-black/30 lg:hidden" />
        <div className="relative flex h-full w-[360px] max-w-[90vw] animate-rise flex-col bg-white lg:h-auto lg:w-full lg:max-w-none lg:animate-none">
          <div className="flex items-center justify-between border-b border-line px-5 py-3 lg:px-0 lg:pt-0 lg:pb-3">
            <h2 className="text-lg font-semibold">Filters</h2>
            {activeCount > 0 && (
              <button type="button" onClick={clearAll} className="hidden cursor-pointer text-sm text-forest hover:underline lg:block">
                Clear all
              </button>
            )}
            <button type="button" aria-label="Close filters" onClick={() => setOpen(false)} className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-mist lg:hidden">
              <CloseIcon />
            </button>
          </div>

          <div className={`flex-1 overflow-y-auto px-5 text-sm transition-opacity lg:overflow-visible lg:px-0 ${pending ? "opacity-60" : ""}`}>
            {facets.qualities.length > 0 && (
              <Section title="Quality" count={selected("quality").length}>
                <div className="flex flex-col gap-3">
                  {facets.qualities.map((q) => (
                    <label key={q} className="flex cursor-pointer items-center gap-3">
                      <input type="checkbox" checked={selected("quality").includes(q)} onChange={() => toggle("quality", q)} className={check} />
                      {q}
                    </label>
                  ))}
                </div>
              </Section>
            )}
            {facets.sizes.length > 0 && (
              <Section title="Size" count={selected("size").length}>
                <div className="flex flex-wrap gap-2">
                  {facets.sizes.map((s) => {
                    const on = selected("size").includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle("size", s)}
                        className={`min-h-9 cursor-pointer rounded-full border px-3.5 text-[13px] transition-colors ${on ? "border-forest bg-forest text-white" : "border-line-strong hover:border-ink"}`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </Section>
            )}
            {facets.colors.length > 0 && (
              <Section title="Colour" count={selected("color").length}>
                <div className="flex flex-wrap gap-2.5">
                  {facets.colors.map((c) => {
                    const on = selected("color").includes(c.name);
                    return (
                      <button
                        key={c.name}
                        type="button"
                        title={c.name}
                        aria-label={c.name}
                        aria-pressed={on}
                        onClick={() => toggle("color", c.name)}
                        className={`h-8 w-8 cursor-pointer rounded-full border-2 border-white ${on ? "ring-2 ring-forest" : "ring-1 ring-line-strong"}`}
                        style={{ background: c.hex }}
                      />
                    );
                  })}
                </div>
              </Section>
            )}
            <Section title="Price" count={params.has("min_price") || params.has("max_price") ? 1 : 0}>
              <PriceFilter
                key={`${params.get("min_price")}-${params.get("max_price")}`}
                facets={facets}
                min={params.get("min_price") ?? ""}
                max={params.get("max_price") ?? ""}
                onApply={(min, max) =>
                  update((qs) => {
                    if (min) qs.set("min_price", min);
                    else qs.delete("min_price");
                    if (max) qs.set("max_price", max);
                    else qs.delete("max_price");
                  })
                }
              />
            </Section>
            <Section title="Rating" count={params.has("min_rating") ? 1 : 0}>
              <div className="flex flex-col gap-3">
                {["4", "3"].map((r) => (
                  <label key={r} className="flex cursor-pointer items-center gap-3">
                    <input type="radio" name="rating" checked={params.get("min_rating") === r} onChange={() => update((qs) => qs.set("min_rating", r))} className={check} />
                    <span>
                      <span className="text-star">★</span> {r} &amp; above
                    </span>
                  </label>
                ))}
              </div>
            </Section>
          </div>

          <div className="flex gap-3 border-t border-line px-5 py-4 lg:hidden">
            <button type="button" onClick={clearAll} disabled={activeCount === 0} className="flex-1 cursor-pointer rounded-full border border-line-strong py-3 text-sm font-medium disabled:opacity-40">
              Clear all
            </button>
            <button type="button" onClick={() => setOpen(false)} className="flex-[2] cursor-pointer rounded-full bg-forest py-3 text-sm font-medium text-white">
              Show {total} {total === 1 ? "product" : "products"}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div role="group" aria-label={title} className="border-b border-line py-4 last:border-b-0">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full cursor-pointer items-center justify-between text-[15px] font-semibold">
        <span>
          {title}
          {count > 0 && <span className="ml-1.5 font-normal text-muted">({count})</span>}
        </span>
        <ChevronDown size={14} className={`text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pt-3.5">{children}</div>}
    </div>
  );
}

function PriceFilter({ facets, min, max, onApply }: { facets: Facets; min: string; max: string; onApply: (min: string, max: string) => void }) {
  const [lo, setLo] = useState(min);
  const [hi, setHi] = useState(max);
  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(lo, hi);
      }}
    >
      <div className="flex items-center gap-2">
        <input type="number" inputMode="numeric" aria-label="Minimum price" placeholder={rs(facets.price_min)} value={lo} onChange={(e) => setLo(e.target.value)} className="w-full min-w-0 rounded-lg border border-line-strong px-3 py-2.5" />
        <span>–</span>
        <input type="number" inputMode="numeric" aria-label="Maximum price" placeholder={rs(facets.price_max)} value={hi} onChange={(e) => setHi(e.target.value)} className="w-full min-w-0 rounded-lg border border-line-strong px-3 py-2.5" />
      </div>
      <button type="submit" className="cursor-pointer self-start rounded-full border border-line-strong px-4 py-2 text-[13px] font-medium hover:border-ink">
        Apply
      </button>
    </form>
  );
}

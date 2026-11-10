"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { bulkProducts, duplicateProduct, setProductFlags } from "@/app/actions/admin";
import { rs } from "@/lib/format";

import { CopyIcon, EyeIcon, StarIcon } from "../ui/icons";
import type { AdminProductRow } from "./types";
import { buttonClass, td, th } from "./ui";

export function ProductTable({ items }: { items: AdminProductRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<number | "bulk" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const all = items.length > 0 && items.every((p) => selected.has(p.id));
  const toggle = (id: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const run = (key: number | "bulk", fn: () => Promise<{ ok: true } | { ok: false; error: string }>, after?: () => void) =>
    start(async () => {
      setBusy(key);
      setError(null);
      const res = await fn();
      setBusy(null);
      if (!res.ok) setError(res.error);
      else after?.();
    });

  const duplicate = (p: AdminProductRow) =>
    start(async () => {
      setBusy(p.id);
      const res = await duplicateProduct(p.id);
      setBusy(null);
      if (res.ok) router.push(`/admin/products/${res.data.id}`);
      else setError(res.error);
    });

  if (items.length === 0) return <p className="px-5 py-10 text-center text-sm text-muted">No products match these filters.</p>;

  return (
    <>
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-forest/5 px-4 py-2.5 text-sm">
          <span className="mr-2 font-medium">{selected.size} selected</span>
          {(
            [
              ["show", "Show in store"],
              ["hide", "Hide"],
              ["feature", "Feature"],
              ["unfeature", "Unfeature"],
            ] as const
          ).map(([action, label]) => (
            <button
              key={action}
              type="button"
              disabled={busy === "bulk"}
              onClick={() => run("bulk", () => bulkProducts([...selected], action), () => setSelected(new Set()))}
              className={buttonClass.secondary}
            >
              {label}
            </button>
          ))}
          <button type="button" onClick={() => setSelected(new Set())} className={buttonClass.ghost}>
            Clear
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="border-b border-line bg-sale-soft px-4 py-2.5 text-sm text-sale">
          {error}
        </p>
      )}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr>
              <th className={`${th} w-10`}>
                <input
                  type="checkbox"
                  aria-label="Select all products on this page"
                  checked={all}
                  onChange={() => setSelected(all ? new Set() : new Set(items.map((p) => p.id)))}
                  className="h-4 w-4 accent-forest"
                />
              </th>
              <th className={th}>Product</th>
              <th className={th}>Category</th>
              <th className={th}>Price</th>
              <th className={th}>Stock</th>
              <th className={`${th} text-right`}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className={`border-t border-line ${selected.has(p.id) ? "bg-forest/5" : "hover:bg-mist/50"} ${busy === p.id ? "opacity-50" : ""}`}>
                <td className={td}>
                  <input type="checkbox" aria-label={`Select ${p.name}`} checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 accent-forest" />
                </td>
                <td className={td}>
                  <Link href={`/admin/products/${p.id}`} className="group flex items-center gap-3">
                    <span className={`relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-mist ${p.is_active ? "" : "opacity-50"}`}>
                      {p.image && <Image src={p.image} alt="" fill sizes="40px" className="object-cover" />}
                    </span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="font-medium group-hover:underline">{p.name}</span>
                      <span className="flex flex-wrap gap-1.5">
                        {!p.is_active && <Pill tone="muted">Hidden</Pill>}
                        {p.is_featured && <Pill tone="gold">Featured</Pill>}
                        {p.badge && <Pill tone="plain">{p.badge}</Pill>}
                        <span className="text-xs text-muted">
                          {p.variant_count} {p.variant_count === 1 ? "option" : "options"}
                        </span>
                      </span>
                    </span>
                  </Link>
                </td>
                <td className={`${td} text-body`}>{p.category}</td>
                <td className={`${td} font-medium`}>{rs(p.price)}</td>
                <td className={td}>
                  {p.total_stock === 0 ? (
                    <span className="font-medium text-sale">Out of stock</span>
                  ) : (
                    <span className="flex flex-col">
                      <span>{p.total_stock} in stock</span>
                      {p.low_stock_variants > 0 && (
                        <Link href={`/admin/inventory?q=${encodeURIComponent(p.name)}`} className="text-xs text-warn hover:underline">
                          {p.low_stock_variants} running low
                        </Link>
                      )}
                    </span>
                  )}
                </td>
                <td className={`${td} text-right whitespace-nowrap`}>
                  <button
                    type="button"
                    title={p.is_active ? "Hide from store" : "Show in store"}
                    aria-label={`${p.is_active ? "Hide" : "Show"} ${p.name}`}
                    onClick={() => run(p.id, () => setProductFlags(p.id, { is_active: !p.is_active }))}
                    className={buttonClass.ghost}
                  >
                    <EyeIcon size={18} off={!p.is_active} />
                  </button>
                  <button
                    type="button"
                    title={p.is_featured ? "Remove from featured" : "Feature on home page"}
                    aria-label={`${p.is_featured ? "Unfeature" : "Feature"} ${p.name}`}
                    aria-pressed={p.is_featured}
                    onClick={() => run(p.id, () => setProductFlags(p.id, { is_featured: !p.is_featured }))}
                    className={`${buttonClass.ghost} ${p.is_featured ? "text-gold" : ""}`}
                  >
                    <StarIcon size={18} fill={p.is_featured ? "currentColor" : "none"} />
                  </button>
                  <button type="button" title="Duplicate" aria-label={`Duplicate ${p.name}`} onClick={() => duplicate(p)} className={buttonClass.ghost}>
                    <CopyIcon size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Pill({ tone, children }: { tone: "muted" | "gold" | "plain"; children: React.ReactNode }) {
  const styles = { muted: "bg-line text-body", gold: "bg-[#F4ECDD] text-[#7A5A22]", plain: "bg-mist text-body" }[tone];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles}`}>{children}</span>;
}

export function DuplicateButton({ id }: { id: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      {error && (
        <span role="alert" className="self-center text-sm text-sale">
          {error}
        </span>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await duplicateProduct(id);
            if (res.ok) router.push(`/admin/products/${res.data.id}`);
            else setError(res.error);
          })
        }
        className={buttonClass.secondary}
      >
        <CopyIcon size={16} />
        {pending ? "Duplicating…" : "Duplicate"}
      </button>
    </>
  );
}

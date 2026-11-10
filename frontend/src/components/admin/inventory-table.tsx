"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";

import { updateStock } from "@/app/actions/admin";
import { rs } from "@/lib/format";

import type { InventoryRow } from "./types";
import { buttonClass, td, th } from "./ui";

/** Stock counts are edited in place and saved together. */
export function InventoryTable({ items, lowThreshold }: { items: InventoryRow[]; lowThreshold: number }) {
  const [edits, setEdits] = useState<Record<number, number>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const changed = Object.entries(edits).filter(([id, stock]) => items.find((v) => v.id === Number(id))?.stock !== stock);
  const clamp = (n: number) => Math.max(0, Math.min(100_000, Math.round(n) || 0));
  const set = (id: number, value: number) => {
    setMessage(null);
    setEdits((e) => ({ ...e, [id]: clamp(value) }));
  };
  // Counts from the latest value, so quick repeated taps all add up.
  const bump = (v: InventoryRow, delta: number) => {
    setMessage(null);
    setEdits((e) => ({ ...e, [v.id]: clamp((e[v.id] ?? v.stock) + delta) }));
  };

  const save = () =>
    start(async () => {
      const res = await updateStock(changed.map(([id, stock]) => ({ id: Number(id), stock })));
      if (res.ok) {
        setEdits({});
        setMessage({ ok: true, text: `Saved stock for ${res.data.updated} ${res.data.updated === 1 ? "option" : "options"}.` });
      } else setMessage({ ok: false, text: res.error });
    });

  if (items.length === 0) return <p className="px-5 py-10 text-center text-sm text-muted">Nothing here. Every option has more than {lowThreshold} in stock.</p>;

  return (
    <>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr>
              <th className={th}>Product</th>
              <th className={th}>Option</th>
              <th className={th}>SKU</th>
              <th className={th}>Price</th>
              <th className={`${th} w-48`}>Stock</th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => {
              const value = edits[v.id] ?? v.stock;
              const dirty = value !== v.stock;
              return (
                <tr key={v.id} className={`border-t border-line ${dirty ? "bg-[#FBF6EA]" : "hover:bg-mist/50"}`}>
                  <td className={td}>
                    <Link href={`/admin/products/${v.product_id}`} className="group flex items-center gap-3">
                      <span className="relative h-11 w-9 shrink-0 overflow-hidden rounded-lg bg-mist">
                        {v.image && <Image src={v.image} alt="" fill sizes="36px" className="object-cover" />}
                      </span>
                      <span className="flex flex-col">
                        <span className="font-medium group-hover:underline">{v.product_name}</span>
                        {!v.product_active && <span className="text-xs text-muted">Hidden from store</span>}
                      </span>
                    </Link>
                  </td>
                  <td className={`${td} text-body`}>{v.label}</td>
                  <td className={`${td} font-mono text-xs text-muted`}>{v.sku}</td>
                  <td className={td}>{rs(v.price)}</td>
                  <td className={td}>
                    <div className="flex items-center gap-1.5">
                      <button type="button" aria-label={`One less ${v.sku}`} onClick={() => bump(v, -1)} disabled={value === 0} className={`${buttonClass.ghost} w-9 border border-line px-0`}>
                        −
                      </button>
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        aria-label={`Stock for ${v.product_name}, ${v.label}`}
                        value={value}
                        onChange={(e) => set(v.id, Number(e.target.value))}
                        className={`h-9 w-16 rounded-lg border px-2 text-center ${value === 0 ? "border-sale text-sale" : value <= lowThreshold ? "border-warn text-warn" : "border-line-strong"}`}
                      />
                      <button type="button" aria-label={`One more ${v.sku}`} onClick={() => bump(v, 1)} className={`${buttonClass.ghost} w-9 border border-line px-0`}>
                        +
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(changed.length > 0 || message) && (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur">
          {message && (
            <p role={message.ok ? "status" : "alert"} className={`mr-auto text-sm ${message.ok ? "text-ok" : "text-sale"}`}>
              {message.text}
            </p>
          )}
          {changed.length > 0 && (
            <>
              <button type="button" onClick={() => setEdits({})} disabled={pending} className={buttonClass.ghost}>
                Discard
              </button>
              <button type="button" onClick={save} disabled={pending} className={buttonClass.primary}>
                {pending ? "Saving…" : `Save ${changed.length} ${changed.length === 1 ? "change" : "changes"}`}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

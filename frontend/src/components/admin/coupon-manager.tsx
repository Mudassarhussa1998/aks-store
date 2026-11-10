"use client";

import { useState, useTransition } from "react";

import { saveCoupon } from "@/app/actions/admin";
import { date, rs } from "@/lib/format";

import type { Coupon, CouponInput } from "./types";
import { Card, inputClass, labelClass, td, th } from "./ui";

const EMPTY: CouponInput = { code: "", kind: "percent", value: 10, min_subtotal: 0, is_active: true, expires_at: null };

export function CouponManager({ coupons }: { coupons: Coupon[] }) {
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function edit(c: Coupon | null) {
    setEditing(c);
    setError(null);
    setForm(c ? { code: c.code, kind: c.kind, value: c.value, min_subtotal: c.min_subtotal, is_active: c.is_active, expires_at: c.expires_at } : EMPTY);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.kind === "percent" && form.value > 90) return setError("A percentage discount can be at most 90%.");
    setError(null);
    start(async () => {
      const res = await saveCoupon(editing?.id ?? null, form);
      if (!res.ok) setError(res.error);
      else edit(null);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        {coupons.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">No coupons yet.</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr><th className={th}>Code</th><th className={th}>Discount</th><th className={th}>Min. order</th><th className={th}>Expires</th><th className={th}>Status</th><th className={th}><span className="sr-only">Edit</span></th></tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className={`${td} font-mono font-semibold`}>{c.code}</td>
                    <td className={td}>{c.kind === "percent" ? `${c.value}%` : rs(c.value)}</td>
                    <td className={td}>{c.min_subtotal ? rs(c.min_subtotal) : "—"}</td>
                    <td className={td}>{c.expires_at ? date(c.expires_at) : "Never"}</td>
                    <td className={td}>{c.is_active ? <span className="text-ok">Active</span> : <span className="text-muted">Off</span>}</td>
                    <td className={td}><button type="button" onClick={() => edit(c)} className="underline">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title={editing ? `Edit ${editing.code}` : "New coupon"} actions={editing ? <button type="button" onClick={() => edit(null)} className="text-sm underline">+ New instead</button> : undefined}>
        <form onSubmit={submit} className="flex flex-col gap-4 p-5">
          <label className={labelClass}>
            Code
            <input className={`${inputClass} font-mono uppercase`} required minLength={3} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, "") }))} placeholder="WINTER10" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Type
              <select className={inputClass} value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as CouponInput["kind"] }))}>
                <option value="percent">Percent off</option>
                <option value="fixed">Rupees off</option>
              </select>
            </label>
            <label className={labelClass}>
              {form.kind === "percent" ? "Percent" : "Amount (Rs)"}
              <input type="number" min={1} required className={inputClass} value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))} />
            </label>
          </div>
          <label className={labelClass}>
            Minimum order (Rs)
            <input type="number" min={0} className={inputClass} value={form.min_subtotal} onChange={(e) => setForm((f) => ({ ...f, min_subtotal: Number(e.target.value) }))} />
          </label>
          <label className={labelClass}>
            Expires on (optional)
            <input
              type="date"
              className={inputClass}
              value={form.expires_at ? form.expires_at.slice(0, 10) : ""}
              onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value ? `${e.target.value}T23:59:59+05:00` : null }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} /> Active</label>
          {error && <p role="alert" className="text-sm text-sale">{error}</p>}
          <button disabled={pending} className="rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">
            {pending ? "Saving…" : editing ? "Save coupon" : "Create coupon"}
          </button>
        </form>
      </Card>
    </div>
  );
}

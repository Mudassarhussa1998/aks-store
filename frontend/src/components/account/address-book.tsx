"use client";

import { useState, useTransition } from "react";

import { deleteAddress, saveAddress, type AddressInput } from "@/app/actions/account";
import { CITIES } from "@/lib/format";
import type { Address } from "@/lib/types";

const input = "rounded border border-line-strong px-3 py-3 font-normal";
const label = "flex flex-col gap-1.5 text-sm font-medium";

export function AddressBook({ addresses, defaults }: { addresses: Address[]; defaults: { name: string; phone: string } }) {
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (editing) {
    const a = editing === "new" ? null : editing;
    return (
      <form
        className="grid max-w-2xl gap-4 sm:grid-cols-2"
        action={(form) =>
          start(async () => {
            const data: AddressInput = {
              label: String(form.get("label") || "Home"),
              name: String(form.get("name")),
              phone: String(form.get("phone")),
              city: String(form.get("city")),
              area: String(form.get("area") ?? ""),
              line: String(form.get("line")),
              is_default: form.get("is_default") === "on",
            };
            const res = await saveAddress(data, a?.id);
            if (res.ok) setEditing(null);
            setError(res.ok ? null : res.error);
          })
        }
      >
        <label className={label}>
          Label
          <input name="label" defaultValue={a?.label ?? "Home"} placeholder="Home, Office…" className={input} />
        </label>
        <label className={label}>
          Full name
          <input name="name" required defaultValue={a?.name ?? defaults.name} className={input} />
        </label>
        <label className={label}>
          Mobile number
          <input name="phone" type="tel" required defaultValue={a?.phone ?? defaults.phone} placeholder="03XX XXXXXXX" className={input} />
        </label>
        <label className={label}>
          City
          <input name="city" required list="address-cities" defaultValue={a?.city} className={input} />
          <datalist id="address-cities">
            {CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label className={`${label} sm:col-span-2`}>
          Area / Sector
          <input name="area" defaultValue={a?.area} className={input} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          Full address
          <textarea name="line" required minLength={5} rows={3} defaultValue={a?.line} className={input} />
        </label>
        <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
          <input type="checkbox" name="is_default" defaultChecked={a?.is_default ?? addresses.length === 0} className="h-4 w-4 accent-forest" /> Use as my default address
        </label>
        {error && <p className="text-sm text-sale sm:col-span-2">{error}</p>}
        <div className="flex gap-3 sm:col-span-2">
          <button disabled={pending} className="cursor-pointer rounded bg-forest px-6 py-3 font-medium text-white disabled:opacity-60">
            {pending ? "Saving…" : "Save address"}
          </button>
          <button type="button" onClick={() => setEditing(null)} className="cursor-pointer rounded border border-line px-6 py-3">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {addresses.map((a) => (
        <div key={a.id} className={`flex flex-col gap-1 rounded-lg p-5 text-sm leading-relaxed ${a.is_default ? "border-2 border-forest" : "border border-line"}`}>
          <div className="flex justify-between">
            <strong>{a.label}</strong>
            {a.is_default && <span className="text-xs font-semibold text-forest">Default</span>}
          </div>
          <span>
            {a.name} · {a.phone}
          </span>
          <span>
            {a.line}, {a.area && `${a.area}, `}
            {a.city}
          </span>
          <div className="mt-2 flex gap-4 text-[13px]">
            <button type="button" onClick={() => setEditing(a)} className="cursor-pointer py-2 underline">
              Edit
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => confirm("Delete this address?") && start(async () => void (await deleteAddress(a.id)))}
              className="cursor-pointer py-2 text-sale underline"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => setEditing("new")} className="min-h-32 cursor-pointer rounded-lg border border-dashed border-line-strong text-sm font-medium">
        + Add new address
      </button>
    </div>
  );
}

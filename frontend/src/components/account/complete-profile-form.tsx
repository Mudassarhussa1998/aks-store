"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateProfile } from "@/app/actions/account";
import { CITIES } from "@/lib/format";
import type { User } from "@/lib/types";

import { Field, inputClass, Notice, primaryButton } from "./form-ui";

/** Collects what Google doesn't give us (mobile number, city), then offers the SMS check. */
export function CompleteProfileForm({ user, next }: { user: User; next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-5"
      action={(form) =>
        start(async () => {
          setError(null);
          const res = await updateProfile({
            name: String(form.get("name")),
            phone: String(form.get("phone")),
            city: String(form.get("city")),
            whatsapp_updates: form.get("whatsapp") === "on",
          });
          if (!res.ok) return setError(res.error);
          router.push(`/verify?only=phone&next=${encodeURIComponent(next)}`);
        })
      }
    >
      <Field label="Full name">
        <input name="name" required minLength={2} autoComplete="name" defaultValue={user.name} className={inputClass} />
      </Field>
      <Field label="Mobile number" hint="Couriers call this number for Cash on Delivery.">
        <input
          name="phone"
          type="tel"
          required
          autoFocus
          autoComplete="tel"
          inputMode="tel"
          placeholder="0300 1234567"
          pattern="(\+92|92|0)\s?3\d{2}[\s\-]?\d{7}"
          title="A Pakistani mobile number, e.g. 0300 1234567"
          className={inputClass}
        />
      </Field>
      <Field label="City" hint="Optional. Helps us show delivery times.">
        <input name="city" list="complete-cities" autoComplete="address-level2" defaultValue={user.city ?? ""} placeholder="e.g. Lahore" className={inputClass} />
        <datalist id="complete-cities">
          {CITIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <label className="flex cursor-pointer items-center gap-3 text-[15px]">
        <input type="checkbox" name="whatsapp" defaultChecked={user.whatsapp_updates} className="h-[18px] w-[18px] accent-forest" />
        Send me order updates on WhatsApp
      </label>
      {error && <Notice tone="error">{error}</Notice>}
      <button disabled={pending} className={primaryButton}>
        {pending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}

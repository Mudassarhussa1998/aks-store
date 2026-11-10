"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";

import { updateProfile } from "@/app/actions/account";
import { changePassword, deleteAccount } from "@/app/actions/auth";
import { CITIES, phone } from "@/lib/format";
import type { User } from "@/lib/types";

import { Field, inputClass, Notice, PasswordInput } from "./form-ui";

const saveButton =
  "h-11 cursor-pointer justify-self-start rounded-full bg-forest px-6 text-[15px] font-medium text-white transition-colors hover:bg-[#16302a] disabled:opacity-60";
type Message = { ok: boolean; text: string } | null;

export function ProfileForm({ user, notice }: { user: User; notice?: string }) {
  return (
    <div className="flex max-w-2xl flex-col gap-5">
      {notice && <Notice tone="ok">{notice}</Notice>}
      <PersonalDetails user={user} />
      <ContactDetails user={user} />
      <PasswordCard hasPassword={user.has_password} />
      <DeleteAccountCard hasPassword={user.has_password} />
    </div>
  );
}

function Card({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-line p-6 sm:p-7">
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="mt-1 text-sm text-muted">{text}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function useSaver() {
  const [message, setMessage] = useState<Message>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, okText: string) =>
    start(async () => {
      setMessage(null);
      const res = await fn();
      setMessage(res.ok ? { ok: true, text: okText } : { ok: false, text: res.error });
    });
  return { message, pending, run };
}

function PersonalDetails({ user }: { user: User }) {
  const { message, pending, run } = useSaver();
  return (
    <Card title="Personal details" text="Helps us suggest the right sizes and send birthday offers.">
      <form
        className="grid gap-5 sm:grid-cols-2"
        action={(form) =>
          run(
            () =>
              updateProfile({
                name: String(form.get("name")),
                gender: (String(form.get("gender")) || null) as User["gender"],
                date_of_birth: String(form.get("date_of_birth")) || null,
                city: String(form.get("city")),
                whatsapp_updates: form.get("whatsapp") === "on",
              }),
            "Your details are saved.",
          )
        }
      >
        <div className="sm:col-span-2">
          <Field label="Full name">
            <input name="name" required minLength={2} autoComplete="name" defaultValue={user.name} className={inputClass} />
          </Field>
        </div>
        <Field label="Gender">
          <select name="gender" defaultValue={user.gender ?? ""} className={`${inputClass} cursor-pointer`}>
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Date of birth">
          <input name="date_of_birth" type="date" max={new Date().toISOString().slice(0, 10)} defaultValue={user.date_of_birth ?? ""} className={inputClass} />
        </Field>
        <Field label="City">
          <input name="city" list="profile-cities" autoComplete="address-level2" defaultValue={user.city ?? ""} placeholder="e.g. Lahore" className={inputClass} />
          <datalist id="profile-cities">
            {CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <label className="flex cursor-pointer items-center gap-3 self-end pb-3 text-[15px] sm:col-span-1">
          <input type="checkbox" name="whatsapp" defaultChecked={user.whatsapp_updates} className="h-[18px] w-[18px] accent-forest" />
          Order updates on WhatsApp
        </label>
        {message && (
          <div className="sm:col-span-2">
            <Notice tone={message.ok ? "ok" : "error"}>{message.text}</Notice>
          </div>
        )}
        <button disabled={pending} className={saveButton}>
          {pending ? "Saving…" : "Save details"}
        </button>
      </form>
    </Card>
  );
}

function ContactDetails({ user }: { user: User }) {
  const { message, pending, run } = useSaver();
  const verifyHref = (only: "email" | "phone") => `/verify?only=${only}&next=${encodeURIComponent("/account?tab=profile")}`;
  return (
    <Card title="Email & mobile" text="Used to sign in, reset your password and reach you about deliveries.">
      <form
        className="grid gap-5"
        action={(form) =>
          run(
            () => updateProfile({ email: String(form.get("email")), phone: String(form.get("phone")) }),
            "Saved. If you changed anything, please verify it again.",
          )
        }
      >
        <Field label="Email" aside={<Status verified={user.email_verified} href={verifyHref("email")} />}>
          <input name="email" type="email" required autoComplete="email" defaultValue={user.email} className={inputClass} />
        </Field>
        <Field label="Mobile number" aside={user.phone && <Status verified={user.phone_verified} href={verifyHref("phone")} />}>
          <input
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="0300 1234567"
            pattern="(\+92|92|0)\s?3\d{2}[\s\-]?\d{7}"
            title="A Pakistani mobile number, e.g. 0300 1234567"
            defaultValue={phone(user.phone)}
            className={inputClass}
          />
        </Field>
        {message && <Notice tone={message.ok ? "ok" : "error"}>{message.text}</Notice>}
        <button disabled={pending} className={saveButton}>
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
    </Card>
  );
}

function Status({ verified, href }: { verified: boolean; href: string }) {
  return verified ? (
    <span className="rounded-full bg-[#E3EEE8] px-2.5 py-0.5 text-xs font-medium text-ok">Verified</span>
  ) : (
    <Link href={href} className="rounded-full bg-sale-soft px-2.5 py-0.5 text-xs font-medium text-sale hover:underline">
      Not verified · Verify now
    </Link>
  );
}

function PasswordCard({ hasPassword }: { hasPassword: boolean }) {
  const { message, pending, run } = useSaver();
  const [key, setKey] = useState(0); // remount to clear the fields after a change
  return (
    <Card
      title="Password"
      text={
        hasPassword
          ? "Changing it signs you out on every other device."
          : "You sign in with Google or Facebook. Set a password if you'd also like to sign in with your email or mobile number."
      }
    >
      <form
        key={key}
        className="grid gap-5 sm:grid-cols-2"
        action={(form) =>
          run(async () => {
            const res = await changePassword(String(form.get("current") ?? ""), String(form.get("new")));
            if (res.ok) setKey((k) => k + 1);
            return res;
          }, hasPassword ? "Password changed. Other devices have been signed out." : "Password set. You can now also sign in with it.")
        }
      >
        {hasPassword && (
          <Field label="Current password">
            <PasswordInput name="current" required autoComplete="current-password" />
          </Field>
        )}
        <Field label="New password" hint="At least 8 characters">
          <PasswordInput name="new" required minLength={8} autoComplete="new-password" />
        </Field>
        {message && (
          <div className="sm:col-span-2">
            <Notice tone={message.ok ? "ok" : "error"}>{message.text}</Notice>
          </div>
        )}
        <button disabled={pending} className={`${saveButton} sm:col-start-1`}>
          {pending ? "Saving…" : hasPassword ? "Change password" : "Set password"}
        </button>
      </form>
    </Card>
  );
}

function DeleteAccountCard({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card title="Delete account" text="Removes your profile, addresses, wishlist, history and reviews. Past orders stay with us for delivery and accounting records, without your account.">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="h-11 cursor-pointer rounded-full border border-line-strong px-6 text-[15px] font-medium text-sale hover:border-sale">
          Delete my account
        </button>
      ) : (
        <form
          className="grid gap-4"
          action={(form) =>
            start(async () => {
              setError(null);
              const res = await deleteAccount(String(form.get("password") ?? ""));
              if (!res.ok) setError(res.error); // on success the action signs out and redirects
            })
          }
        >
          {hasPassword && (
            <Field label="Enter your password to confirm">
              <PasswordInput name="password" required autoComplete="current-password" />
            </Field>
          )}
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" required className="mt-0.5 h-[18px] w-[18px] accent-sale" />
            I understand this can&apos;t be undone.
          </label>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex flex-wrap gap-2">
            <button disabled={pending} className="h-11 cursor-pointer rounded-full bg-sale px-6 text-[15px] font-medium text-white disabled:opacity-60">
              {pending ? "Deleting…" : "Permanently delete account"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="h-11 cursor-pointer rounded-full px-5 text-[15px] hover:bg-mist">
              Keep my account
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

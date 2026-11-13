"use client";

import { useState, useTransition } from "react";

import { sendContact } from "@/app/actions/shop";

import { Field, inputClass, Notice, primaryButton } from "./account/form-ui";

export const TOPICS = [
  ["order", "An order"],
  ["returns", "Returns & exchanges"],
  ["product", "A product question"],
  ["wholesale", "Wholesale or bulk order"],
  ["careers", "Careers"],
  ["other", "Something else"],
] as const;

type Defaults = { name: string; email: string; phone: string; topic: string; message: string };

export function ContactForm({ defaults }: { defaults: Defaults }) {
  const [topic, setTopic] = useState(TOPICS.some(([id]) => id === defaults.topic) ? defaults.topic : "order");
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (sent) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Notice tone="ok">{sent}</Notice>
        <button type="button" onClick={() => setSent(null)} className="cursor-pointer text-sm text-forest hover:underline">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      className="grid gap-5 sm:grid-cols-2"
      action={(form) =>
        start(async () => {
          setError(null);
          const res = await sendContact({
            topic,
            name: String(form.get("name")),
            email: String(form.get("email")),
            phone: String(form.get("phone") ?? ""),
            order_number: String(form.get("order_number") ?? ""),
            message: String(form.get("message")),
            website: String(form.get("website") ?? ""),
          });
          if (res.ok) setSent(res.data.detail);
          else setError(res.error);
        })
      }
    >
      <div className="sm:col-span-2">
        <Field label="What's it about?">
          <select value={topic} onChange={(e) => setTopic(e.target.value)} className={`${inputClass} cursor-pointer`}>
            {TOPICS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Your name">
        <input name="name" required minLength={2} autoComplete="name" defaultValue={defaults.name} className={inputClass} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" defaultValue={defaults.email} className={inputClass} />
      </Field>
      <Field label="Mobile number" hint="Optional, if you'd like a call or WhatsApp back.">
        <input name="phone" type="tel" autoComplete="tel" placeholder="0300 1234567" defaultValue={defaults.phone} className={inputClass} />
      </Field>
      {topic === "order" || topic === "returns" ? (
        <Field label="Order number" hint="Optional. Starts with VLZ-.">
          <input name="order_number" placeholder="VLZ-XXXXXX" className={`${inputClass} uppercase`} />
        </Field>
      ) : (
        <span className="hidden sm:block" />
      )}
      <div className="sm:col-span-2">
        <Field label={topic === "careers" ? "Tell us about yourself" : "Message"} hint={topic === "careers" ? "Include the role, your experience, and a link to your CV or portfolio." : undefined}>
          <textarea name="message" required minLength={10} maxLength={4000} rows={6} defaultValue={defaults.message} className={`${inputClass} h-auto py-3`} />
        </Field>
      </div>
      {/* Hidden from people; spam bots fill it in and their message is dropped. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      {error && (
        <div className="sm:col-span-2">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      <div className="sm:col-span-2">
        <button disabled={pending} className={`${primaryButton} sm:w-auto sm:px-10`}>
          {pending ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}

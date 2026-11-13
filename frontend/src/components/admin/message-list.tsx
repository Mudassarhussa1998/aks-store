"use client";

import Link from "next/link";
import { useTransition } from "react";

import { markMessage } from "@/app/actions/admin";
import { phone } from "@/lib/format";

import type { ContactMessage } from "./types";
import { buttonClass } from "./ui";

const TOPIC: Record<string, string> = {
  order: "Order",
  returns: "Returns",
  product: "Product",
  wholesale: "Wholesale",
  careers: "Careers",
  other: "Other",
};

export function MessageList({ messages }: { messages: ContactMessage[] }) {
  if (messages.length === 0) return <p className="px-5 py-10 text-center text-sm text-muted">No messages here.</p>;
  return (
    <ul className="divide-y divide-line">
      {messages.map((m) => (
        <MessageRow key={m.id} message={m} />
      ))}
    </ul>
  );
}

function MessageRow({ message: m }: { message: ContactMessage }) {
  const [pending, start] = useTransition();
  const wa = m.phone ? `https://wa.me/${m.phone.replace(/\D/g, "")}` : null;
  return (
    <li className={`flex flex-col gap-3 px-5 py-5 ${m.is_read ? "" : "bg-forest/[0.03]"} ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-2.5">
        {!m.is_read && <span className="h-2 w-2 rounded-full bg-forest" aria-label="Unread" />}
        <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-medium">{TOPIC[m.topic] ?? m.topic}</span>
        <strong className="text-[15px] font-semibold">{m.name}</strong>
        <span className="text-sm text-muted">{m.email}</span>
        {m.phone && <span className="text-sm text-muted">· {phone(m.phone)}</span>}
        <span className="ml-auto text-xs text-muted">{new Date(m.created_at).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}</span>
      </div>
      {m.order_number && (
        <Link href={`/admin/orders/${m.order_number}`} className="self-start text-sm text-forest hover:underline">
          Order #{m.order_number}
        </Link>
      )}
      <p className="text-[15px] leading-relaxed whitespace-pre-line text-body">{m.message}</p>
      <div className="flex flex-wrap gap-2">
        <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message to Velenzay")}`} className={buttonClass.secondary}>
          Reply by email
        </a>
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className={buttonClass.secondary}>
            WhatsApp
          </a>
        )}
        <button type="button" disabled={pending} onClick={() => start(async () => void (await markMessage(m.id, !m.is_read)))} className={buttonClass.ghost}>
          {m.is_read ? "Mark unread" : "Mark as read"}
        </button>
      </div>
    </li>
  );
}

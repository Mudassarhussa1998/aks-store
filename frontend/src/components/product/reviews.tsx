"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { markHelpful, writeReview } from "@/app/actions/account";
import { date } from "@/lib/format";
import type { Review } from "@/lib/types";

import { Stars } from "../ui/icons";

export function ReviewList({ reviews }: { reviews: Review[] }) {
  return (
    <div className="flex flex-col">
      {reviews.map((r) => (
        <ReviewItem key={r.id} review={r} />
      ))}
    </div>
  );
}

function ReviewItem({ review: r }: { review: Review }) {
  const [helpful, setHelpful] = useState<number | null>(null);
  return (
    <article className="mb-6 flex flex-col gap-2 border-b border-line pb-6">
      <div className="flex flex-wrap justify-between gap-3">
        <Stars value={r.rating} />
        <span className="text-[13px] text-muted">{date(r.created_at)}</span>
      </div>
      <strong className="text-[15px] font-semibold">{r.title}</strong>
      <p className="text-sm leading-relaxed text-body">{r.body}</p>
      <div className="flex flex-wrap gap-3 text-[13px] text-muted">
        <span>
          {r.author}
          {r.city && ` · ${r.city}`}
        </span>
        {r.verified && <span className="font-medium text-forest">Verified purchase</span>}
        {r.variant_label && <span>Bought: {r.variant_label}</span>}
      </div>
      <button
        type="button"
        disabled={helpful !== null}
        onClick={() => {
          setHelpful(r.helpful_count + 1);
          markHelpful(r.id);
        }}
        className="cursor-pointer self-start rounded-full border border-line px-3.5 py-2 text-[13px] disabled:cursor-default"
      >
        {helpful !== null ? `Thanks · Helpful (${helpful})` : `Helpful (${r.helpful_count})`}
      </button>
    </article>
  );
}

export function ReviewForm({ slug, signedIn }: { slug: string; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  if (!signedIn) {
    return (
      <Link href={`/login?next=/p/${slug}%23reviews`} className="rounded-full border border-ink px-5 py-3 text-sm font-medium">
        Sign in to write a review
      </Link>
    );
  }
  if (message?.ok) return <p className="rounded-xl bg-mist px-4 py-3 text-sm">{message.text}</p>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="cursor-pointer rounded-full border border-ink px-5 py-3 text-sm font-medium">
        Write a review
      </button>
    );
  }
  return (
    <form
      className="flex w-full max-w-xl flex-col gap-4 rounded-2xl bg-mist p-5"
      action={(form) =>
        start(async () => {
          const res = await writeReview(slug, {
            rating,
            title: String(form.get("title") ?? ""),
            body: String(form.get("body") ?? ""),
          });
          setMessage(res.ok ? { ok: true, text: "Thank you! Your review is live." } : { ok: false, text: res.error });
        })
      }
    >
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={rating === n}
              onClick={() => setRating(n)}
              className={`h-11 w-11 cursor-pointer text-3xl ${n <= rating ? "text-star" : "text-line-strong"}`}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Title
        <input name="title" required minLength={2} maxLength={120} className="rounded-xl border border-line-strong bg-white px-3.5 py-3 font-normal outline-none focus:border-forest" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Your review
        <textarea name="body" required minLength={5} rows={4} className="rounded-xl border border-line-strong bg-white px-3.5 py-3 font-normal outline-none focus:border-forest" />
      </label>
      {message && !message.ok && <p className="text-sm text-sale">{message.text}</p>}
      <button disabled={pending} className="cursor-pointer self-start rounded-full bg-forest px-6 py-3 text-sm font-medium text-white disabled:opacity-60">
        {pending ? "Posting…" : "Post review"}
      </button>
    </form>
  );
}

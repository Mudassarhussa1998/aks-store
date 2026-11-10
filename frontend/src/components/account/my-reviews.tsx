"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { deleteMyReview, editMyReview } from "@/app/actions/account";
import { date } from "@/lib/format";
import type { Review } from "@/lib/types";

import { Stars } from "../ui/icons";
import { inputClass, Notice } from "./form-ui";

export function MyReviews({ reviews }: { reviews: Review[] }) {
  return (
    <div className="flex flex-col gap-4">
      {reviews.map((r) => (
        <MyReview key={r.id} review={r} />
      ))}
    </div>
  );
}

function MyReview({ review }: { review: Review }) {
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(review.rating);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const remove = () => {
    if (!confirm(`Delete your review of ${review.product_name}?`)) return;
    start(async () => {
      const res = await deleteMyReview(review.id);
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <article className={`flex flex-col gap-2 rounded-2xl border border-line p-5 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Link href={`/p/${review.product_slug}#reviews`} className="font-semibold hover:underline">
          {review.product_name}
        </Link>
        <span className="text-[13px] text-muted">{date(review.created_at)}</span>
      </div>

      {editing ? (
        <form
          className="flex flex-col gap-3"
          action={(form) =>
            start(async () => {
              setError(null);
              const res = await editMyReview(review.id, { rating, title: String(form.get("title")), body: String(form.get("body")) });
              if (res.ok) setEditing(false);
              else setError(res.error);
            })
          }
        >
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onClick={() => setRating(n)}
                className={`h-10 w-10 cursor-pointer text-2xl ${n <= rating ? "text-star" : "text-line-strong"}`}
              >
                ★
              </button>
            ))}
          </div>
          <input name="title" aria-label="Title" required minLength={2} maxLength={120} defaultValue={review.title} className={inputClass} />
          <textarea name="body" aria-label="Your review" required minLength={5} rows={4} defaultValue={review.body} className={`${inputClass} h-auto py-3`} />
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex gap-2">
            <button disabled={pending} className="h-10 cursor-pointer rounded-full bg-forest px-5 text-sm font-medium text-white disabled:opacity-60">
              {pending ? "Saving…" : "Save review"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="h-10 cursor-pointer rounded-full px-4 text-sm hover:bg-mist">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <Stars value={review.rating} />
          <strong className="text-[15px] font-semibold">{review.title}</strong>
          <p className="text-sm leading-relaxed text-body">{review.body}</p>
          {review.is_published === false && <p className="text-[13px] text-warn">Hidden by our team. Only you can see it.</p>}
          {error && <Notice tone="error">{error}</Notice>}
          <div className="mt-1 flex gap-1">
            <button type="button" onClick={() => setEditing(true)} className="h-9 cursor-pointer rounded-full border border-line-strong px-4 text-sm hover:border-ink">
              Edit
            </button>
            <button type="button" onClick={remove} disabled={pending} className="h-9 cursor-pointer rounded-full px-4 text-sm text-sale hover:bg-sale-soft">
              Delete
            </button>
          </div>
        </>
      )}
    </article>
  );
}

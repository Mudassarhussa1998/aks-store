"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { deleteReview, moderateReview } from "@/app/actions/admin";
import { Stars } from "@/components/ui/icons";
import { date } from "@/lib/format";
import type { Review } from "@/lib/types";

export function ReviewRow({ review }: { review: Review }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const published = review.is_published !== false;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      setError(res.ok ? null : (res.error ?? "Failed"));
    });

  return (
    <li className={`flex flex-col gap-2 px-5 py-4 ${published ? "" : "bg-[#FBF8F2]"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-3">
          <Stars value={review.rating} />
          <strong className="font-semibold">{review.title}</strong>
          {!published && <span className="rounded-full bg-[#FBEFD9] px-2 py-0.5 text-xs font-semibold text-[#7A4E0B]">Hidden</span>}
        </span>
        <span className="text-muted">{date(review.created_at)}</span>
      </div>
      <p className="text-sm leading-relaxed text-body">{review.body}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span>{review.author}{review.city && ` · ${review.city}`}</span>
        {review.product_slug && (
          <Link href={`/p/${review.product_slug}`} className="underline">{review.product_name}</Link>
        )}
        {review.verified && <span className="font-medium text-ok">Verified purchase</span>}
        <span className="ml-auto flex gap-3 text-sm">
          <button type="button" disabled={pending} onClick={() => run(() => moderateReview(review.id, !published))} className="underline">
            {published ? "Hide" : "Publish"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => confirm("Delete this review permanently?") && run(() => deleteReview(review.id))}
            className="text-sale underline"
          >
            Delete
          </button>
        </span>
      </div>
      {error && <p role="alert" className="text-sm text-sale">{error}</p>}
    </li>
  );
}

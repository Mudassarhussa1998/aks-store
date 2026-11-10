import { Suspense } from "react";

import { ReviewRow } from "@/components/admin/review-row";
import { adminApi } from "@/components/admin/server";
import { Card, PageHeader, TableSkeleton } from "@/components/admin/ui";
import type { Review } from "@/lib/types";

export default function ReviewsPage() {
  return (
    <>
      <PageHeader title="Reviews" subtitle="Hidden reviews are listed first. Hiding a review removes it from the product rating." />
      <Suspense fallback={<TableSkeleton />}>
        <Reviews />
      </Suspense>
    </>
  );
}

async function Reviews() {
  const reviews = await adminApi<Review[]>("/reviews");
  return (
    <Card>
      {reviews.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted">No reviews yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {reviews.map((r) => <ReviewRow key={r.id} review={r} />)}
        </ul>
      )}
    </Card>
  );
}

import { Suspense } from "react";

import { CouponManager } from "@/components/admin/coupon-manager";
import { adminApi } from "@/components/admin/server";
import type { Coupon } from "@/components/admin/types";
import { PageHeader, TableSkeleton } from "@/components/admin/ui";

export default function CouponsPage() {
  return (
    <>
      <PageHeader title="Coupons" subtitle="Customers enter these codes in the cart." />
      <Suspense fallback={<TableSkeleton />}>
        <Coupons />
      </Suspense>
    </>
  );
}

async function Coupons() {
  return <CouponManager coupons={await adminApi<Coupon[]>("/coupons")} />;
}

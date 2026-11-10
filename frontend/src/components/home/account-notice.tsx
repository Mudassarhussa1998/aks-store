"use client";

import { useSearchParams } from "next/navigation";

/** Shown once after someone deletes their account (they land on /?account=deleted). */
export function AccountNotice() {
  const params = useSearchParams();
  if (params.get("account") !== "deleted") return null;
  return (
    <p role="status" className="bg-forest px-4 py-3 text-center text-sm text-white">
      Your account has been deleted. Thank you for shopping with Aks.pk.
    </p>
  );
}

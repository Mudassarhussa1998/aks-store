import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthShell, AuthSkeleton } from "@/components/account/auth-shell";
import { CompleteProfileForm } from "@/components/account/complete-profile-form";
import { safeNext } from "@/lib/oauth";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Complete your profile", robots: { index: false } };

type Params = { next?: string; welcome?: string };

export default function CompleteProfilePage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <Suspense
      fallback={
        <AuthShell title="One last step">
          <AuthSkeleton rows={3} />
        </AuthShell>
      }
    >
      {searchParams.then((params) => (
        <CompleteProfile {...params} />
      ))}
    </Suspense>
  );
}

async function CompleteProfile({ next, welcome }: Params) {
  const target = safeNext(next);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(target)}`);
  if (user.phone) redirect(target);

  return (
    <AuthShell
      title={welcome ? `Welcome, ${user.name.split(" ")[0]}!` : "One last step"}
      subtitle="Add your mobile number so we can deliver your orders. It takes a few seconds."
    >
      <CompleteProfileForm user={user} next={target} />
    </AuthShell>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthShell, AuthSkeleton } from "@/components/account/auth-shell";
import { VerifyFlow, type VerifyStep } from "@/components/account/verify-flow";
import { phone } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Verify your account", robots: { index: false } };

type Params = { next?: string; sent?: string; only?: string };

export default function VerifyPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <AuthShell title="Verify your account" subtitle="A quick check that your email and mobile number are really yours.">
      <Suspense fallback={<AuthSkeleton rows={1} />}>
        {searchParams.then((params) => (
          <Verify {...params} />
        ))}
      </Suspense>
    </AuthShell>
  );
}

async function Verify({ next, sent, only }: Params) {
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/account";
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/verify?next=${target}`)}`);

  const steps: VerifyStep[] = [];
  if (!user.email_verified && only !== "phone") steps.push({ channel: "email", target: user.email });
  if (user.can_verify_phone && !user.phone_verified && user.phone && only !== "email") steps.push({ channel: "phone", target: phone(user.phone) });

  return <VerifyFlow steps={steps} sentFirst={sent === "email" && steps[0]?.channel === "email"} next={target} />;
}

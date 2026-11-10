import type { Metadata } from "next";
import { Suspense } from "react";

import { RegisterForm } from "@/components/account/auth-forms";
import { AuthShell, AuthSkeleton } from "@/components/account/auth-shell";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <AuthShell title="Create your account" subtitle="Faster checkout, order history and a wishlist that follows you.">
      <Suspense fallback={<AuthSkeleton rows={4} />}>
        {searchParams.then(({ next }) => (
          <RegisterForm next={next ?? "/account"} />
        ))}
      </Suspense>
    </AuthShell>
  );
}

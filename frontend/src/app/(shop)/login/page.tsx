import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/account/auth-forms";
import { AuthShell, AuthSkeleton } from "@/components/account/auth-shell";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <AuthShell title="Sign in to Aks" subtitle="Track orders, save addresses and keep a wishlist.">
      <Suspense fallback={<AuthSkeleton rows={2} />}>
        {searchParams.then(({ next }) => (
          <LoginForm next={next ?? "/account"} />
        ))}
      </Suspense>
    </AuthShell>
  );
}

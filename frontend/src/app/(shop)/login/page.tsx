import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/account/auth-forms";
import { AuthShell, AuthSkeleton } from "@/components/account/auth-shell";
import { Notice } from "@/components/account/form-ui";
import { SocialButtons } from "@/components/account/social-buttons";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const SIGN_IN_ERRORS: Record<string, string> = {
  google: "Google sign-in didn't work. Please try again, or use your email.",
  "google-cancelled": "Google sign-in was cancelled.",
  "google-expired": "That Google sign-in took too long. Please try again.",
  "google-off": "Google sign-in is coming soon. For now, please sign in with your email or mobile number.",
  facebook: "Facebook sign-in didn't work. Please try again, or use your email.",
  "facebook-cancelled": "Facebook sign-in was cancelled.",
  "facebook-expired": "That Facebook sign-in took too long. Please try again.",
  "facebook-noemail": "Your Facebook account didn't share an email address. Please sign up with your email or Google instead.",
  "facebook-off": "Facebook sign-in is coming soon. For now, please sign in with your email or mobile number.",
  "admin-social": "Admin accounts sign in with email and password.",
};

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  return (
    <AuthShell title="Sign in to Velenzay" subtitle="Track orders, save addresses and keep a wishlist.">
      <Suspense fallback={<AuthSkeleton rows={2} />}>
        {searchParams.then(({ next, error }) => (
          <>
            {error && SIGN_IN_ERRORS[error] && (
              <div className="mb-5">
                <Notice tone="error">{SIGN_IN_ERRORS[error]}</Notice>
              </div>
            )}
            <SocialButtons next={next ?? "/account"} google facebook />
            <LoginForm next={next ?? "/account"} />
          </>
        ))}
      </Suspense>
    </AuthShell>
  );
}

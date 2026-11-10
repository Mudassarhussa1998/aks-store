import type { Metadata } from "next";

import { AuthShell } from "@/components/account/auth-shell";
import { ResetFlow } from "@/components/account/reset-flow";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="We'll send you a 6-digit code to set a new one.">
      <ResetFlow />
    </AuthShell>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { forgotPassword, resetPassword } from "@/app/actions/auth";

import { Field, inputClass, Notice, OtpInput, PasswordInput, primaryButton, useCountdown } from "./form-ui";

/** Step 1: email or phone → a code is sent. Step 2: code + new password → signed in. */
export function ResetFlow() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [stage, setStage] = useState<"ask" | "reset">("ask");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const countdown = useCountdown();

  const request = () =>
    start(async () => {
      setError(null);
      const res = await forgotPassword(identifier);
      if (!res.ok) return setError(res.error);
      setInfo(res.data);
      setStage("reset");
      setCode("");
      countdown.start(60);
    });

  if (stage === "ask") {
    return (
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          request();
        }}
      >
        <Field label="Email or mobile number" hint="We'll send a 6-digit code to your email, or by SMS to a mobile number you've verified.">
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoFocus
            autoComplete="username"
            placeholder="you@example.com or 0300 1234567"
            className={inputClass}
          />
        </Field>
        {error && <Notice tone="error">{error}</Notice>}
        <button disabled={pending} className={primaryButton}>
          {pending ? "Sending…" : "Send code"}
        </button>
        <Link href="/login" className="self-center text-sm text-forest hover:underline">
          Back to sign in
        </Link>
      </form>
    );
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const res = await resetPassword(identifier, code, password);
          if (!res.ok) return setError(res.error);
          router.push("/account?tab=profile&reset=1");
          router.refresh();
        });
      }}
    >
      {info && <Notice tone="info">{info}</Notice>}
      <Field label="6-digit code">
        <OtpInput value={code} onChange={setCode} disabled={pending} autoFocus />
      </Field>
      <Field label="New password">
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
        <span className={`text-[13px] font-normal ${password.length >= 8 ? "text-ok" : "text-muted"}`}>
          {password.length >= 8 ? "✓ " : ""}At least 8 characters
        </span>
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <button disabled={pending || code.length < 6 || password.length < 8} className={primaryButton}>
        {pending ? "Saving…" : "Reset password"}
      </button>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <button type="button" onClick={() => setStage("ask")} className="cursor-pointer text-forest hover:underline">
          Use a different email or number
        </button>
        {countdown.left > 0 ? (
          <span className="text-muted">Resend in {countdown.left}s</span>
        ) : (
          <button type="button" onClick={request} disabled={pending} className="cursor-pointer font-medium text-forest hover:underline">
            Send a new code
          </button>
        )}
      </div>
    </form>
  );
}

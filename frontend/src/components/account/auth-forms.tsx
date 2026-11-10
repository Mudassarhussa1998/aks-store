"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { login, register, type AuthState } from "@/app/actions/auth";

import { Field, inputClass, Notice, PasswordInput, primaryButton } from "./form-ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <Field label="Email or mobile number">
        <input
          name="identifier"
          required
          autoComplete="username"
          placeholder="you@example.com or 0300 1234567"
          defaultValue={state.values?.identifier}
          className={inputClass}
        />
      </Field>
      <div className="flex flex-col gap-2">
        <Field label="Password">
          <PasswordInput name="password" required autoComplete="current-password" />
        </Field>
        <Link href="/forgot-password" className="self-end text-[13px] text-forest hover:underline">
          Forgot password?
        </Link>
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <button disabled={pending} className={primaryButton}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-body">
        New to Aks?{" "}
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-medium text-forest hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(register, {});
  const [password, setPassword] = useState("");
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <Field label="Full name">
        <input name="name" required minLength={2} autoComplete="name" defaultValue={state.values?.name} className={inputClass} />
      </Field>
      <Field label="Email" hint="We'll send a code to confirm it.">
        <input name="email" type="email" required autoComplete="email" defaultValue={state.values?.email} className={inputClass} />
      </Field>
      <Field label="Mobile number" hint="For delivery calls and order updates.">
        <input
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          inputMode="tel"
          placeholder="0300 1234567"
          pattern="(\+92|92|0)\s?3\d{2}[\s\-]?\d{7}"
          title="A Pakistani mobile number, e.g. 0300 1234567"
          defaultValue={state.values?.phone}
          className={inputClass}
        />
      </Field>
      <Field label="Password">
        <PasswordInput name="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <span className={`text-[13px] font-normal ${password.length >= 8 ? "text-ok" : "text-muted"}`}>
          {password.length >= 8 ? "✓ " : ""}At least 8 characters
        </span>
      </Field>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <button disabled={pending} className={primaryButton}>
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-sm text-body">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-forest hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

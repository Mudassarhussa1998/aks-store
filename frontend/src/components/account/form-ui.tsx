"use client";

import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from "react";

export const inputClass =
  "h-12 w-full rounded-xl border border-line-strong bg-white px-3.5 text-[15px] font-normal outline-none transition-shadow placeholder:text-muted/70 focus:border-forest focus:ring-4 focus:ring-forest/10 disabled:bg-mist disabled:text-muted";

export const primaryButton =
  "flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-forest px-6 text-[15px] font-medium text-white transition-colors hover:bg-[#16302a] disabled:cursor-default disabled:opacity-60";

export function Field({ label, hint, aside, children }: { label: string; hint?: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      <span className="flex items-center justify-between gap-3">
        {label}
        {aside}
      </span>
      {children}
      {hint && <span className="text-[13px] font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block">
      <input {...props} type={show ? "text" : "password"} className={`${inputClass} pr-16`} />
      <button
        type="button"
        onClick={() => setShow(!show)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 cursor-pointer px-4 text-[13px] font-medium text-forest"
      >
        {show ? "Hide" : "Show"}
      </button>
    </span>
  );
}

/** Six boxes backed by one real input, so SMS autofill, paste and backspace all behave natively. */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, "").slice(0, 6);
          onChange(next);
          if (next.length === 6 && next !== value) onComplete?.(next);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        autoFocus={autoFocus}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        aria-label="6-digit code"
        className="absolute inset-0 z-10 h-full w-full cursor-text text-transparent caret-transparent opacity-0"
      />
      <div aria-hidden className="grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }, (_, i) => {
          const current = focused && i === Math.min(value.length, 5);
          return (
            <span
              key={i}
              className={`flex h-14 items-center justify-center rounded-xl border text-2xl font-semibold transition-shadow ${
                current ? "border-forest ring-4 ring-forest/10" : "border-line-strong"
              } ${disabled ? "bg-mist text-muted" : "bg-white"}`}
            >
              {value[i] ?? ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function Notice({ tone, children }: { tone: "error" | "ok" | "info"; children: ReactNode }) {
  const styles = { error: "bg-sale-soft text-sale", ok: "bg-[#E3EEE8] text-ok", info: "bg-mist text-body" }[tone];
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${styles}`}>
      {children}
    </p>
  );
}

/** Seconds left before "Resend" is allowed again. */
export function useCountdown(initial = 0) {
  const [left, setLeft] = useState(initial);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return { left, start: setLeft };
}

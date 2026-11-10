"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { confirmCode, sendCode, type Channel } from "@/app/actions/auth";

import { CheckIcon } from "../ui/icons";
import { Notice, OtpInput, primaryButton, useCountdown } from "./form-ui";

export type VerifyStep = { channel: Channel; target: string };

/** Walks through each unverified channel (email first, then phone), then offers to continue. */
export function VerifyFlow({ steps: initialSteps, sentFirst, next }: { steps: VerifyStep[]; sentFirst: boolean; next: string }) {
  // Keep the list from the first render: each verification refreshes the page, which drops finished steps.
  const [steps] = useState(initialSteps);
  const [index, setIndex] = useState(0);
  const step = steps[index];

  if (!step) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-14 w-14 animate-fade items-center justify-center rounded-full bg-[#E3EEE8] text-ok">
          <CheckIcon size={28} />
        </span>
        <p className="text-[17px] font-medium">You&apos;re all set.</p>
        <Link href={next} className={primaryButton}>
          Continue
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {steps.length > 1 && (
        <ol className="flex gap-2" aria-label="Progress">
          {steps.map((s, i) => (
            <li key={s.channel} aria-current={i === index ? "step" : undefined} className={`h-1 flex-1 rounded-full ${i <= index ? "bg-forest" : "bg-line"}`}>
              <span className="sr-only">
                {s.channel === "email" ? "Email" : "Mobile"} {i < index ? "(done)" : ""}
              </span>
            </li>
          ))}
        </ol>
      )}
      <CodeStep key={step.channel} step={step} alreadySent={index === 0 && sentFirst} onDone={() => setIndex(index + 1)} />
      {step.channel === "phone" && (
        <button type="button" onClick={() => setIndex(index + 1)} className="cursor-pointer self-center text-sm text-muted hover:text-ink">
          Skip for now
        </button>
      )}
    </div>
  );
}

function CodeStep({ step, alreadySent, onDone }: { step: VerifyStep; alreadySent: boolean; onDone: () => void }) {
  const [sent, setSent] = useState(alreadySent);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Sign-up already sent the first email code, so the resend timer starts running straight away.
  const countdown = useCountdown(alreadySent ? 60 : 0);
  const what = step.channel === "email" ? "email" : "mobile number";

  const send = () =>
    start(async () => {
      setError(null);
      const res = await sendCode(step.channel);
      if (res.ok) {
        setSent(true);
        setCode("");
        countdown.start(res.data.retry_after);
      } else setError(res.error);
    });

  const verify = (value: string) =>
    start(async () => {
      setError(null);
      const res = await confirmCode(step.channel, value);
      if (res.ok) onDone();
      else {
        setError(res.error);
        setCode("");
      }
    });

  if (!sent) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-[15px] text-body">
          We&apos;ll send a 6-digit code to <strong className="font-semibold text-ink">{step.target}</strong> to confirm your {what}.
        </p>
        {error && <Notice tone="error">{error}</Notice>}
        <button type="button" onClick={send} disabled={pending} className={primaryButton}>
          {pending ? "Sending…" : step.channel === "email" ? "Email me a code" : "Text me a code"}
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === 6) verify(code);
      }}
    >
      <p className="text-[15px] text-body">
        Enter the 6-digit code we sent to <strong className="font-semibold text-ink">{step.target}</strong>.
      </p>
      <OtpInput value={code} onChange={setCode} onComplete={verify} disabled={pending} autoFocus />
      {error && <Notice tone="error">{error}</Notice>}
      <button disabled={pending || code.length < 6} className={primaryButton}>
        {pending ? "Checking…" : `Verify ${what}`}
      </button>
      <p className="text-center text-sm text-muted">
        Didn&apos;t get it?{" "}
        {countdown.left > 0 ? (
          <span>Resend in {countdown.left}s</span>
        ) : (
          <button type="button" onClick={send} disabled={pending} className="cursor-pointer font-medium text-forest hover:underline">
            Send a new code
          </button>
        )}
      </p>
    </form>
  );
}

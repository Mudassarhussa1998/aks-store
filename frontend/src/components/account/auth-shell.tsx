import type { ReactNode } from "react";

/** Centred card used by sign in, sign up, verification and password reset. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-mist px-4 py-12 md:py-20">
      <div className="mx-auto w-full max-w-[440px] animate-rise rounded-3xl bg-white p-6 shadow-[0_2px_24px_rgb(0_0_0/0.05)] sm:p-9">
        <h1 className="text-[28px] leading-tight font-semibold">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-muted">{subtitle}</p>}
        <div className="mt-7">{children}</div>
      </div>
    </div>
  );
}

export function AuthSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex animate-pulse flex-col gap-5" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-12 rounded-xl bg-mist" />
      ))}
      <div className="h-12 rounded-full bg-mist" />
    </div>
  );
}

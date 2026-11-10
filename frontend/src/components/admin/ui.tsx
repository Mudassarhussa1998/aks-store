import Link from "next/link";
import type { ReactNode } from "react";

import { STATUS_LABEL } from "@/lib/format";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-[#FBEFD9] text-[#7A4E0B]",
  confirmed: "bg-[#E4ECF5] text-[#23466E]",
  shipped: "bg-[#E9E4F3] text-[#4A3577]",
  delivered: "bg-[#E3EEE8] text-[#1E5A3E]",
  cancelled: "bg-[#F1ECE4] text-[#5A4A2E]",
  returned: "bg-sale-soft text-sale",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status] ?? ""}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = "" }: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-line bg-white ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function ButtonLink({ href, children, primary = false }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-white hover:bg-[#16302a] hover:text-white"
          : "rounded-full border border-line-strong bg-white px-5 py-2.5 text-sm font-medium hover:border-ink"
      }
    >
      {children}
    </Link>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="mb-3 h-6 animate-pulse rounded-lg bg-mist last:mb-0" />
      ))}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line-strong bg-white px-3 py-2.5 text-sm outline-none transition-shadow focus:border-forest focus:ring-4 focus:ring-forest/10";
export const labelClass = "flex flex-col gap-1.5 text-sm font-medium";
export const th = "bg-mist/60 px-4 py-2.5 text-left text-xs font-medium text-muted";
export const td = "px-4 py-3 align-middle";

export const buttonClass = {
  primary: "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-forest px-5 text-sm font-medium text-white hover:bg-[#16302a] disabled:opacity-50",
  secondary: "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-line-strong bg-white px-4 text-sm font-medium hover:border-ink disabled:opacity-50",
  ghost: "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-sm text-body hover:bg-mist disabled:opacity-50",
};

/** Pill tabs that link to filtered views, e.g. All / Visible / Hidden. */
export function FilterTabs({ tabs }: { tabs: { href: string; label: string; count?: number; active: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${t.active ? "bg-ink font-medium text-white hover:text-white" : "bg-white text-body hover:bg-line/60"}`}
        >
          {t.label}
          {t.count !== undefined && <span className={`ml-1.5 ${t.active ? "text-white/70" : "text-muted"}`}>{t.count}</span>}
        </Link>
      ))}
    </div>
  );
}

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center gap-1.5 border-t border-line px-4 py-3 text-sm">
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <Link
          key={n}
          href={href(n)}
          aria-current={n === page ? "page" : undefined}
          className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2 ${n === page ? "bg-ink text-white hover:text-white" : "hover:bg-mist"}`}
        >
          {n}
        </Link>
      ))}
    </nav>
  );
}

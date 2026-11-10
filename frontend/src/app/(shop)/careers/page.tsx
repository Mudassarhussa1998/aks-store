import type { Metadata } from "next";
import Link from "next/link";

import { CheckIcon, ChevronRight } from "@/components/ui/icons";
import { CAREERS, CONTACT } from "@/content/company";

export const metadata: Metadata = {
  title: "Careers",
  description: "Join the Rawaj.pk team in Lahore or remotely: customer care, warehouse and content roles.",
  alternates: { canonical: "/careers" },
};

export default function CareersPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 pb-16 md:pt-20">
      <p className="text-[15px] font-semibold text-forest">Careers</p>
      <h1 className="mt-3 max-w-3xl text-[clamp(36px,5vw,60px)] leading-[1.04] font-semibold tracking-[-0.03em]">Grow with Rawaj.</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-body">{CAREERS.intro}</p>

      <ul className="mt-10 grid gap-3 sm:grid-cols-2">
        {CAREERS.perks.map((p) => (
          <li key={p} className="flex items-center gap-3 rounded-2xl bg-mist px-5 py-4 text-[15px]">
            <CheckIcon size={18} className="shrink-0 text-forest" />
            {p}
          </li>
        ))}
      </ul>

      <h2 className="mt-16 text-3xl font-semibold">Open roles</h2>
      <div className="mt-6 flex flex-col gap-4">
        {CAREERS.roles.map((r) => (
          <article key={r.title} className="rounded-3xl border border-line p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">{r.title}</h3>
                <p className="mt-1 text-[15px] text-muted">
                  {r.type} · {r.location}
                </p>
              </div>
              <Link
                href={`/contact?topic=careers&role=${encodeURIComponent(r.title)}`}
                className="arrow-nudge inline-flex items-center gap-1.5 rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-white hover:bg-[#16302a] hover:text-white"
              >
                Apply <ChevronRight size={13} />
              </Link>
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-body">{r.text}</p>
            <ul className="mt-4 flex flex-col gap-1.5 text-[15px] text-body">
              {r.needs.map((n) => (
                <li key={n} className="flex gap-2.5">
                  <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-forest" />
                  {n}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <p className="mt-10 text-[15px] text-body">
        Don&apos;t see your role? Send us a note about yourself through the{" "}
        <Link href="/contact?topic=careers" className="font-medium text-forest underline underline-offset-2">
          contact form
        </Link>{" "}
        or email {CONTACT.email}.
      </p>
    </div>
  );
}

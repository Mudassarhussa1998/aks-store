import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/seo/json-ld";
import { TERMS, TERMS_UPDATED } from "@/content/legal";
import { breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms for shopping at Velenzay: orders, Cash on Delivery, prices, delivery, cancellations, returns and refunds, and your account.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 pb-16 md:pt-16">
      <JsonLd data={breadcrumbJsonLd([{ name: "Terms & Conditions", path: "/terms" }])} />
      <h1 className="text-[clamp(34px,5vw,52px)] leading-tight font-semibold tracking-[-0.03em]">Terms &amp; Conditions</h1>
      <p className="mt-3 text-[15px] text-muted">Last updated {TERMS_UPDATED}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[240px_1fr]">
        <nav aria-label="On this page" className="hidden lg:block">
          <ol className="sticky top-24 flex flex-col gap-1 text-sm">
            {TERMS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-lg px-3 py-1.5 text-body hover:bg-mist hover:text-ink">
                  {s.title.replace(/^\d+\.\s*/, "")}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="max-w-3xl">
          <p className="rounded-2xl bg-mist px-5 py-4 text-[15px] leading-relaxed text-body">
            In short: you pay in cash when your order arrives, you can cancel free until it ships, and you can return unused items within 7 days. The full terms
            are below.
          </p>
          {TERMS.map((s) => (
            <section key={s.id} id={s.id} className="mt-10 scroll-mt-28">
              <h2 className="text-xl font-semibold">{s.title}</h2>
              <div className="mt-3 flex flex-col gap-3 text-[16px] leading-relaxed text-body">
                {s.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </section>
          ))}
          <p className="mt-12 text-[15px] text-body">
            See also:{" "}
            <Link href="/help/privacy" className="text-forest underline underline-offset-2">
              Privacy policy
            </Link>{" "}
            ·{" "}
            <Link href="/help/returns" className="text-forest underline underline-offset-2">
              Returns &amp; exchanges
            </Link>{" "}
            ·{" "}
            <Link href="/help/delivery" className="text-forest underline underline-offset-2">
              Delivery information
            </Link>
          </p>
        </article>
      </div>
    </div>
  );
}

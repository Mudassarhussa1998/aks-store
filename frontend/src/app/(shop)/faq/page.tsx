import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/seo/json-ld";
import { ChevronDown } from "@/components/ui/icons";
import { FAQ } from "@/content/company";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Answers about Cash on Delivery, delivery times and charges, returns, product qualities and your Rawaj.pk account.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 pb-16 md:pt-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.flatMap((s) => s.items).map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
        }}
      />
      <h1 className="text-[clamp(34px,5vw,52px)] leading-tight font-semibold tracking-[-0.03em]">Frequently asked questions</h1>
      <p className="mt-3 text-lg text-body">
        Can&apos;t find your answer?{" "}
        <Link href="/contact" className="text-forest underline underline-offset-2">
          Contact us
        </Link>
        .
      </p>
      {FAQ.map((s) => (
        <section key={s.section} className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">{s.section}</h2>
          <div className="divide-y divide-line rounded-2xl border border-line">
            {s.items.map((i) => (
              <details key={i.q} className="group px-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-medium">
                  {i.q}
                  <ChevronDown size={15} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
                </summary>
                <p className="pb-5 text-[15px] leading-relaxed text-body">{i.a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

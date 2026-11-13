import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Mark } from "@/components/brand/logo";
import { ChevronRight } from "@/components/ui/icons";
import { ABOUT } from "@/content/company";

export const metadata: Metadata = {
  title: "About us",
  description: "Velenzay is a Pakistani clothing and home brand: honest fabric, fair prices and Cash on Delivery across Pakistan.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-sand">
        <Image src="/hero/fabric-wide.jpg" alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-60" />
        <div className="mx-auto max-w-7xl px-4 py-20 md:py-32">
          <p className="animate-rise text-[15px] font-semibold text-forest">About Velenzay</p>
          <h1 className="mt-3 max-w-3xl animate-rise text-[clamp(40px,6vw,72px)] leading-[1.02] font-semibold tracking-[-0.035em] [animation-delay:60ms]">
            Made for the way Pakistan lives.
          </h1>
          <p className="mt-6 max-w-2xl animate-rise text-lg leading-relaxed text-body [animation-delay:120ms] md:text-xl">{ABOUT.intro}</p>
        </div>
      </section>

      <section className="reveal mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-[1fr_1.2fr] md:items-center md:py-24">
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-mist">
          <Image src="/hero/fabric-tall.jpg" alt="Soft white fabric" fill sizes="(max-width: 768px) 100vw, 40vw" className="object-cover" />
        </div>
        <div>
          <Mark size={56} className="mb-5" />
          <h2 className="text-3xl font-semibold md:text-[40px]">Our story</h2>
          <div className="mt-5 flex flex-col gap-4 text-[17px] leading-relaxed text-body">
            {ABOUT.story.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="reveal bg-mist">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <h2 className="text-3xl font-semibold md:text-[40px]">What we stand for</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ABOUT.values.map((v) => (
              <div key={v.title} className="rounded-3xl bg-white p-7">
                <h3 className="text-lg font-semibold">{v.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-body">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="reveal mx-auto max-w-7xl px-4 py-16">
        <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {ABOUT.numbers.map((n) => (
            <div key={n.label} className="border-l-2 border-forest pl-5">
              <dt className="text-[15px] text-muted">{n.label}</dt>
              <dd className="order-first text-4xl font-semibold tracking-tight md:text-5xl">{n.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-14 flex flex-wrap items-center gap-x-7 gap-y-3">
          <Link href="/shop" className="rounded-full bg-forest px-7 py-3.5 text-[15px] font-medium text-white hover:bg-[#16302a] hover:text-white">
            Shop the collection
          </Link>
          <Link href="/careers" className="arrow-nudge inline-flex items-center gap-1 text-[17px] text-forest hover:underline">
            Work with us <ChevronRight size={14} />
          </Link>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ContactForm } from "@/components/contact-form";
import { JsonLd } from "@/components/seo/json-ld";
import { ChatIcon, ClockIcon, PinIcon, UserIcon } from "@/components/ui/icons";
import { CONTACT } from "@/content/company";
import { phone } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Questions about an order, returns or our products? Message Velenzay on WhatsApp or email. We reply within one working day.",
  alternates: { canonical: "/contact" },
};

type Params = { topic?: string; role?: string };

export default function ContactPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 pb-16 md:pt-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          url: `${SITE_URL}/contact`,
          mainEntity: { "@type": "Organization", name: "Velenzay", url: SITE_URL, contactPoint: [{ "@type": "ContactPoint", contactType: "customer service", areaServed: "PK", availableLanguage: ["en", "ur"] }] },
        }}
      />
      <h1 className="text-[clamp(34px,5vw,56px)] leading-tight font-semibold tracking-[-0.03em]">Contact us</h1>
      <p className="mt-3 max-w-xl text-lg text-body">We&apos;re here to help with orders, returns and anything else. We reply within one working day.</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[340px_1fr]">
        <aside className="flex flex-col gap-3">
          {[
            { Icon: ChatIcon, label: "WhatsApp", value: CONTACT.whatsapp, href: CONTACT.whatsappLink },
            { Icon: UserIcon, label: "Email", value: CONTACT.email },
            { Icon: ClockIcon, label: "Hours", value: CONTACT.hours },
            { Icon: PinIcon, label: "Address", value: CONTACT.address },
          ].map(({ Icon, label, value, href }) => (
            <div key={label} className="flex items-start gap-4 rounded-2xl bg-mist p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-forest">
                <Icon size={19} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] text-muted">{label}</span>
                {href ? (
                  <a href={href} className="block text-[15px] font-medium break-words text-forest hover:underline">
                    {value}
                  </a>
                ) : (
                  <span className="block text-[15px] font-medium break-words">{value}</span>
                )}
              </span>
            </div>
          ))}
          <p className="mt-2 px-1 text-sm text-body">
            Looking for something quick? See the{" "}
            <Link href="/faq" className="text-forest underline underline-offset-2">
              FAQ
            </Link>{" "}
            or{" "}
            <Link href="/track" className="text-forest underline underline-offset-2">
              track your order
            </Link>
            .
          </p>
        </aside>

        <section className="rounded-3xl border border-line p-6 md:p-8">
          <h2 className="mb-6 text-xl font-semibold">Send us a message</h2>
          <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-mist" />}>
            {searchParams.then((params) => (
              <FormWithDefaults {...params} />
            ))}
          </Suspense>
        </section>
      </div>
    </div>
  );
}

async function FormWithDefaults({ topic, role }: Params) {
  const user = await getCurrentUser();
  return (
    <ContactForm
      defaults={{
        name: user?.name ?? "",
        email: user?.email ?? "",
        phone: phone(user?.phone),
        topic: topic ?? "order",
        message: role ? `I'd like to apply for the ${role} role.\n\n` : "",
      }}
    />
  );
}

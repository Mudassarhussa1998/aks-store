import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

// Placeholder copy: replace the [bracketed] details with your real business information before launch.
const PAGES: Record<string, { title: string; body: string[] }> = {
  delivery: {
    title: "Delivery information",
    body: [
      "We deliver across Pakistan. Orders in major cities usually arrive in 2–4 working days; other areas can take 5–7 working days.",
      "Delivery is free on orders over Rs 3,000. Below that, a flat Rs 250 delivery charge applies.",
      "Before dispatch we call or WhatsApp you to confirm the order. Once shipped, you'll get a tracking number by SMS.",
    ],
  },
  returns: {
    title: "Returns & exchanges",
    body: [
      "You can return or exchange unused items with tags attached within 7 days of delivery.",
      "For hygiene reasons, opened pillows and inner wear can't be returned unless faulty.",
      "To start a return, contact us with your order number and we'll arrange the pickup. [Add your refund method and timeline here.]",
    ],
  },
  contact: {
    title: "Contact us",
    body: [
      "WhatsApp: [your WhatsApp number] — Monday to Saturday, 10am to 7pm.",
      "Email: [your support email]",
      "Please include your order number so we can help quickly.",
    ],
  },
  about: {
    title: "About Aks",
    body: [
      "Aks brings clothing for the family and soft essentials for the home together in one place, with Cash on Delivery across Pakistan.",
      "[Tell your brand story here: who you are, where you source from and what you care about.]",
    ],
  },
  privacy: {
    title: "Privacy policy",
    body: [
      "We collect your name, phone, email and delivery address only to process and deliver your orders and to contact you about them.",
      "We never sell your personal information. [Have this policy reviewed before launch.]",
    ],
  },
  terms: {
    title: "Terms of service",
    body: ["[Add your terms of sale: pricing, order acceptance, delivery, returns and liability. Have them reviewed before launch.]"],
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = PAGES[(await params).slug];
  return page ? { title: page.title } : {};
}

export default async function HelpPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = PAGES[(await params).slug];
  if (!page) notFound();
  return (
    <article className="mx-auto max-w-2xl px-4 pt-10 pb-16">
      <h1 className="tracking-tight mb-6 text-4xl font-semibold">{page.title}</h1>
      <div className="flex flex-col gap-4 text-[16px] leading-relaxed text-body">
        {page.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <Link href="/track" className="mt-8 inline-block text-sm font-medium underline">
        Track an order
      </Link>
    </article>
  );
}

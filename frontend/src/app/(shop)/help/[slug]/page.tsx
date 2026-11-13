import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { summary } from "@/lib/seo";

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
  privacy: {
    title: "Privacy policy",
    body: [
      "We collect your name, phone, email and delivery address only to process and deliver your orders and to contact you about them.",
      "We never sell your personal information. [Have this policy reviewed before launch.]",
    ],
  },
  "delete-your-data": {
    title: "Deleting your data",
    body: [
      "You can delete your Velenzay account and personal data at any time, including if you signed up with Google or Facebook.",
      "Sign in, open My Account → Profile, and choose Delete account at the bottom of the page. Your profile, saved addresses, wishlist, browsing history, reviews and Google/Facebook sign-in links are removed straight away.",
      "Orders you placed are kept for delivery and accounting records, but are no longer linked to an account.",
      "If you can no longer sign in, contact us from the email or mobile number on your account and we'll delete it for you within 7 days. [Add your support contact.]",
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;
  const page = PAGES[slug];
  return page ? { title: page.title, description: summary(page.body[0]), alternates: { canonical: `/help/${slug}` } } : {};
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

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { Suspense } from "react";

import { AccountNotice } from "@/components/home/account-notice";
import { JsonLd } from "@/components/seo/json-ld";
import { HeroVideo } from "@/components/home/hero-video";
import { NewArrivalsTabs } from "@/components/home/new-arrivals";
import { ProductGrid } from "@/components/product/product-card";
import { CashIcon, ChatIcon, CheckIcon, ChevronRight, ReturnIcon, Stars, TruckIcon } from "@/components/ui/icons";
import { CATEGORY_ROW, CLOTHING_ROOTS, COMFORT, HERO, REVIEW_PRODUCTS, TILES } from "@/content/home";
import { getCategories, getProduct, getReviews, listProducts } from "@/lib/catalog";
import { rs } from "@/lib/format";
import { organizationJsonLd } from "@/lib/seo";
import type { Category, ProductDetail } from "@/lib/types";

export const metadata: Metadata = { alternates: { canonical: "/" } };

async function getHomeData() {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");

  const slugs = new Set<string>([...HERO.cards.map((c) => c.product), ...TILES.map((t) => t.product), ...COMFORT.map((c) => c.product)]);
  const [categories, newest, details, reviews] = await Promise.all([
    getCategories(),
    listProducts({ sort: "newest", page_size: 24 }),
    Promise.all([...slugs].map(getProduct)),
    Promise.all(REVIEW_PRODUCTS.map((slug) => getReviews(slug))),
  ]);
  const products = Object.fromEntries(details.filter((d): d is ProductDetail => !!d).map((d) => [d.slug, d]));
  return { categories, newest: newest.items, products, reviews: reviews.flatMap((r) => r.items.slice(0, 1)) };
}

export default async function HomePage() {
  const { categories, newest, products, reviews } = await getHomeData();
  const image = (slug: string, i = 0) => products[slug]?.images[i]?.url ?? products[slug]?.images[0]?.url ?? null;

  // Group new arrivals by their top-level category to fill the Clothing / Home tabs.
  const rootOf = new Map<string, string>();
  const walk = (nodes: Category[], root?: string) =>
    nodes.forEach((c) => {
      rootOf.set(c.name, root ?? c.slug);
      walk(c.children, root ?? c.slug);
    });
  walk(categories);
  const isClothing = (name: string) => CLOTHING_ROOTS.includes(rootOf.get(name) ?? "");
  const flat = categories.flatMap((c) => [c, ...c.children]);
  const row = CATEGORY_ROW.map((slug) => flat.find((c) => c.slug === slug)).filter((c): c is Category => !!c);

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <Suspense fallback={null}>
        <AccountNotice />
      </Suspense>
      <section aria-label="Winter collection" className="relative isolate flex h-[calc(100svh-104px)] min-h-[560px] max-h-[880px] overflow-hidden bg-sand">
        <HeroVideo wide={HERO.video.wide} tall={HERO.video.tall} />
        {/* Cream wash keeps the dark headline readable over the moving fabric. */}
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#f4f1ec] via-[#f4f1ec]/55 to-[#f4f1ec]/5 md:bg-gradient-to-r md:from-[#f4f1ec]/95 md:via-[#f4f1ec]/60 md:to-transparent" />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col justify-end px-4 pb-10 md:justify-center md:pb-0">
          <div className="max-w-2xl">
            <p className="inline-flex animate-rise items-center gap-2 rounded-full bg-white/70 px-3.5 py-1.5 text-[13px] font-medium text-forest backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-forest" />
              {HERO.eyebrow}
            </p>
            <h1 className="mt-5 animate-rise text-[clamp(44px,7.5vw,104px)] leading-[0.98] font-semibold tracking-[-0.045em] [animation-delay:80ms]">
              {HERO.title}
            </h1>
            <p className="mt-5 max-w-md animate-rise text-[17px] leading-relaxed text-body [animation-delay:160ms] md:text-xl">{HERO.text}</p>
            <div className="mt-8 flex animate-rise flex-wrap items-center gap-3 [animation-delay:240ms]">
              <Link href={HERO.cta.href} className="arrow-nudge inline-flex h-12 items-center gap-2 rounded-full bg-forest px-7 text-[15px] font-medium text-white transition-colors hover:bg-[#16302a] hover:text-white">
                {HERO.cta.label}
                <ChevronRight size={14} />
              </Link>
              <Link href={HERO.link.href} className="inline-flex h-12 items-center rounded-full border border-ink/15 bg-white/60 px-7 text-[15px] font-medium backdrop-blur transition-colors hover:bg-white">
                {HERO.link.label}
              </Link>
            </div>
            <ul className="mt-10 hidden animate-fade flex-wrap gap-x-6 gap-y-2 text-[13px] text-body [animation-delay:400ms] sm:flex">
              {HERO.points.map((point) => (
                <li key={point} className="flex items-center gap-2">
                  <CheckIcon size={15} className="text-forest" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="pt-4 md:pt-6">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 pb-16 md:h-[620px] md:grid-cols-[1.3fr_1fr] md:grid-rows-2 md:gap-4">
          {HERO.cards.map((c, i) => {
            const feature = i === 0;
            return (
              <Link
                key={c.href}
                href={c.href}
                className={`zoom group relative animate-fade overflow-hidden rounded-3xl bg-line ${
                  feature ? "col-span-2 aspect-[4/5] sm:aspect-[4/3] md:col-span-1 md:row-span-2 md:aspect-auto" : "aspect-square md:aspect-auto"
                }`}
                style={{ animationDelay: `${240 + i * 80}ms` }}
              >
                {image(c.product) && (
                  <Image
                    src={image(c.product)!}
                    alt=""
                    fill
                    priority={feature}
                    sizes={feature ? "(max-width: 768px) 100vw, 56vw" : "(max-width: 768px) 50vw, 44vw"}
                    className={`object-cover ${feature ? "object-top" : ""}`}
                  />
                )}
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                <span className={`absolute inset-x-0 bottom-0 flex flex-col items-start text-white ${feature ? "gap-2 p-6 md:p-10" : "gap-1 p-4 md:p-7"}`}>
                  <span className="text-[13px] font-medium text-white/80">{c.label}</span>
                  <span className={`leading-tight font-semibold tracking-tight ${feature ? "text-3xl md:text-5xl" : "text-lg md:text-[28px]"}`}>{c.title}</span>
                  <span className={`text-white/85 ${feature ? "text-[15px] md:text-lg" : "hidden text-[15px] md:block"}`}>{c.text}</span>
                  <span
                    className={`arrow-nudge mt-2 inline-flex items-center gap-1.5 rounded-full bg-white font-medium text-ink transition-colors group-hover:bg-sand ${
                      feature ? "px-5 py-2.5 text-[15px] md:mt-4" : "px-3.5 py-1.5 text-[13px] md:px-4 md:py-2 md:text-sm"
                    }`}
                  >
                    {c.cta}
                    <ChevronRight size={13} />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="reveal mx-auto max-w-7xl px-4 pt-16 pb-6">
        <SectionHeading title="Shop by category" href="/shop" link="All products" />
        <div className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-8 md:overflow-visible md:px-0">
          {row.map((c) => (
            <Link key={c.slug} href={`/c/${c.slug}`} className="group flex w-24 shrink-0 flex-col items-center gap-3 text-center md:w-auto">
              <span className="zoom relative aspect-square w-full max-w-36 overflow-hidden rounded-full bg-mist ring-offset-4 transition-shadow group-hover:ring-2 group-hover:ring-forest">
                {c.image_url && <Image src={c.image_url} alt="" fill sizes="(max-width: 768px) 96px, 12vw" className="object-cover" />}
              </span>
              <span className="text-sm font-medium group-hover:text-forest">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="reveal mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading title="New arrivals" />
          <NewArrivalsTabs
            grids={{
              all: <ProductGrid products={newest.slice(0, 8)} />,
              clothing: <ProductGrid products={newest.filter((p) => isClothing(p.category)).slice(0, 8)} />,
              home: <ProductGrid products={newest.filter((p) => !isClothing(p.category)).slice(0, 8)} />,
            }}
          />
        </div>
      </section>

      <section className="reveal mx-auto grid max-w-7xl gap-4 px-4 pt-4 pb-16 md:grid-cols-2">
        {TILES.map((t) => (
          <Link key={t.href} href={t.href} className="zoom group flex flex-col overflow-hidden rounded-3xl bg-mist text-center">
            <span className="flex flex-col items-center gap-1.5 px-6 pt-10 pb-7">
              <span className="text-[28px] leading-tight font-semibold tracking-tight md:text-[32px]">{t.title}</span>
              <span className="text-[17px] text-muted">{t.text}</span>
              <span className="mt-2 inline-flex items-center gap-1 text-[17px] text-forest group-hover:underline">
                {t.cta} <ChevronRight size={14} />
              </span>
            </span>
            <span className="relative mt-auto aspect-[4/3] w-full overflow-hidden">
              {image(t.product) && <Image src={image(t.product)!} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />}
            </span>
          </Link>
        ))}
      </section>

      <section className="reveal border-t border-line">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="mx-auto mb-10 max-w-xl text-center">
            <h2 className="text-3xl font-semibold md:text-[40px]">Choose your comfort</h2>
            <p className="mt-3 text-[17px] leading-relaxed text-muted">Every blanket comes in three qualities. Pick the warmth that suits your city.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {COMFORT.map((q) => {
              const dark = "highlight" in q && q.highlight;
              const from = products[q.product]?.variants.filter((v) => v.quality === q.name).map((v) => v.price);
              return (
                <Link
                  key={q.name}
                  href={`/p/${q.product}`}
                  className={`lift flex flex-col gap-1.5 rounded-3xl p-4 pb-6 ${dark ? "bg-forest text-white hover:text-white" : "bg-mist"}`}
                >
                  <div className="zoom relative mb-4 h-52 overflow-hidden rounded-2xl bg-line">
                    {image(q.product, q.image) && <Image src={image(q.product, q.image)!} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />}
                    {dark && <span className="absolute top-3 left-3 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink">Most loved</span>}
                  </div>
                  <span className="px-2 text-[13px] font-medium opacity-70">{q.gsm}</span>
                  <span className="px-2 text-2xl font-semibold tracking-tight">{q.name}</span>
                  <span className="px-2 text-[15px] leading-relaxed opacity-80">{q.text}</span>
                  {from && from.length > 0 && <span className="mt-auto px-2 pt-3 text-[15px] font-semibold">From {rs(Math.min(...from))}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="reveal bg-mist">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <h2 className="mb-8 text-3xl font-semibold md:text-[40px]">Loved in every city</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {reviews.map((r) => (
                <figure key={r.id} className="flex flex-col gap-4 rounded-3xl bg-white p-7">
                  <Stars value={r.rating} />
                  <blockquote className="text-[17px] leading-relaxed">“{r.body}”</blockquote>
                  <figcaption className="mt-auto flex items-center gap-3 pt-2 text-[13px]">
                    {r.product_slug && image(r.product_slug) && (
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-line">
                        <Image src={image(r.product_slug)!} alt="" fill sizes="44px" className="object-cover" />
                      </span>
                    )}
                    <span className="flex flex-col">
                      <strong className="text-sm font-semibold">{r.author}</strong>
                      <span className="text-muted">{[r.city, r.product_name].filter(Boolean).join(" · ")}</span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { Icon: CashIcon, title: "Cash on Delivery", text: "Pay when your parcel arrives." },
            { Icon: TruckIcon, title: "Nationwide delivery", text: "2–4 working days in major cities." },
            { Icon: ReturnIcon, title: "7-day easy returns", text: "Unused items, no questions asked." },
            { Icon: ChatIcon, title: "Help on WhatsApp", text: "Talk to a real person." },
          ].map(({ Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mist text-forest">
                <Icon />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{title}</span>
                <span className="text-sm text-muted">{text}</span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function SectionHeading({ title, href, link }: { title: string; href?: string; link?: string }) {
  return (
    <div className="mb-7 flex flex-1 flex-wrap items-end justify-between gap-4">
      <h2 className="text-3xl font-semibold md:text-[40px]">{title}</h2>
      {href && (
        <Link href={href} className="arrow-nudge inline-flex items-center gap-1 text-[15px] text-forest hover:underline">
          {link} <ChevronRight size={13} />
        </Link>
      )}
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { Suspense } from "react";

import { AccountNotice } from "@/components/home/account-notice";
import { NewArrivalsTabs } from "@/components/home/new-arrivals";
import { ProductGrid } from "@/components/product/product-card";
import { CashIcon, ChatIcon, ChevronRight, ReturnIcon, Stars, TruckIcon } from "@/components/ui/icons";
import { CATEGORY_ROW, CLOTHING_ROOTS, COMFORT, HERO, REVIEW_PRODUCTS, TILES } from "@/content/home";
import { getCategories, getProduct, getReviews, listProducts } from "@/lib/catalog";
import { rs } from "@/lib/format";
import type { Category, ProductDetail } from "@/lib/types";

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
      <Suspense fallback={null}>
        <AccountNotice />
      </Suspense>
      <section className="bg-mist">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-12 text-center md:pt-24 md:pb-16">
          <p className="animate-rise text-[15px] font-semibold text-forest">{HERO.eyebrow}</p>
          <h1 className="mx-auto mt-3 max-w-4xl animate-rise text-[clamp(40px,7vw,80px)] leading-[1.04] font-semibold tracking-[-0.035em] [animation-delay:60ms]">
            {HERO.title}
          </h1>
          <p className="mx-auto mt-5 max-w-xl animate-rise text-lg leading-relaxed text-muted [animation-delay:120ms] md:text-xl">{HERO.text}</p>
          <div className="mt-8 flex animate-rise flex-wrap items-center justify-center gap-x-7 gap-y-3 [animation-delay:180ms]">
            <Link href={HERO.cta.href} className="rounded-full bg-forest px-7 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-[#16302a] hover:text-white">
              {HERO.cta.label}
            </Link>
            <Link href={HERO.link.href} className="arrow-nudge inline-flex items-center gap-1 text-[17px] text-forest hover:underline">
              {HERO.link.label}
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-7xl pb-16 md:px-4">
          <div className="flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 [scrollbar-width:none] md:grid md:grid-cols-3 md:overflow-visible md:px-0">
            {HERO.cards.map((c, i) => (
              <Link
                key={c.href}
                href={c.href}
                className="zoom relative aspect-[4/5] w-[78%] shrink-0 animate-fade snap-start overflow-hidden rounded-3xl bg-line md:w-auto"
                style={{ animationDelay: `${240 + i * 80}ms` }}
              >
                {image(c.product) && (
                  <Image src={image(c.product)!} alt="" fill priority={i === 0} sizes="(max-width: 768px) 78vw, 33vw" className="object-cover" />
                )}
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-6 text-white">
                  <span className="flex flex-col">
                    <span className="text-2xl font-semibold tracking-tight">{c.title}</span>
                    <span className="text-[15px] text-white/85">{c.text}</span>
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 text-ink">
                    <ChevronRight size={14} />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="reveal mx-auto max-w-7xl px-4 pt-16 pb-6">
        <SectionHeading title="Shop by category" href="/shop" link="All products" />
        <div className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-8 md:overflow-visible md:px-0">
          {row.map((c) => (
            <Link key={c.slug} href={`/c/${c.slug}`} className="group flex w-24 shrink-0 flex-col items-center gap-3 text-center md:w-auto">
              <span className="zoom relative aspect-square w-full overflow-hidden rounded-2xl bg-mist">
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

      <section className="border-b border-line">
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

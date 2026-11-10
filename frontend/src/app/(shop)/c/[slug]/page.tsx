import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Listing, ListingSkeleton, parseQuery, type SearchParams } from "@/components/listing/listing";
import { JsonLd } from "@/components/seo/json-ld";
import { CATEGORY_COPY } from "@/content/seo";
import { findCategory, getCategories } from "@/lib/catalog";
import { breadcrumbJsonLd, categoryTrail, summary } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateStaticParams() {
  const tree = await getCategories();
  return tree.flatMap((c) => [c, ...c.children]).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const hit = findCategory(await getCategories(), slug);
  if (!hit) return {};
  const { node } = hit;
  const copy = CATEGORY_COPY[node.slug];
  const description = summary(
    copy?.paragraphs[0] ??
      `Shop ${node.name.toLowerCase()} online at Rawaj.pk${node.description ? ` — ${node.description.toLowerCase()}` : ""}. Fair prices, Cash on Delivery and 7-day returns across Pakistan.`,
  );
  return {
    title: `${node.name} — Shop Online in Pakistan`,
    description,
    alternates: { canonical: `/c/${node.slug}` }, // filtered and sorted views point back to the plain category
    openGraph: { title: `${node.name} · Rawaj.pk`, description, url: `/c/${node.slug}`, images: node.image_url ? [{ url: `${node.image_url}-1080.webp`, alt: node.name }] : undefined },
  };
}

// The slug is read inside Suspense so the route can also be rebuilt at runtime after the catalog changes.
export default function CategoryPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 pt-16 pb-16"><ListingSkeleton /></div>}>
      {params.then(({ slug }) => (
        <Category slug={slug} searchParams={searchParams} />
      ))}
    </Suspense>
  );
}

async function Category({ slug, searchParams }: { slug: string; searchParams: Promise<SearchParams> }) {
  const hit = findCategory(await getCategories(), slug);
  if (!hit) notFound();
  const { node, path } = hit;
  const copy = CATEGORY_COPY[node.slug];

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-16">
      <JsonLd data={breadcrumbJsonLd(categoryTrail(path))} />
      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-[13px] text-muted">
        <Link href="/">Home</Link>
        {path.map((c, i) => (
          <span key={c.slug} className="flex gap-2">
            <span>/</span>
            {i === path.length - 1 ? <span className="text-ink">{c.name}</span> : <Link href={`/c/${c.slug}`}>{c.name}</Link>}
          </span>
        ))}
      </nav>
      <header className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="tracking-tight text-4xl font-semibold md:text-5xl">{node.name}</h1>
          {node.description && <p className="mt-2 text-[15px] text-muted">{node.description}</p>}
        </div>
        {node.children.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {node.children.map((c) => (
              <Link key={c.slug} href={`/c/${c.slug}`} className="zoom flex items-center gap-2.5 rounded-full border border-line py-1 pr-4 pl-1 text-sm font-medium hover:border-forest">
                <span className="relative h-9 w-9 overflow-hidden rounded-full bg-mist">
                  {c.image_url && <Image src={c.image_url} alt="" fill sizes="36px" className="object-cover" />}
                </span>
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </header>
      <Suspense fallback={<ListingSkeleton />}>
        {searchParams.then((sp) => (
          <Listing base={{ category: slug }} query={parseQuery(sp)} searchParams={sp} basePath={`/c/${slug}`} />
        ))}
      </Suspense>
      {copy && (
        <section className="mt-16 border-t border-line pt-10">
          <h2 className="text-2xl font-semibold">{copy.heading}</h2>
          <div className="mt-4 flex max-w-3xl flex-col gap-3 text-[15px] leading-relaxed text-body">
            {copy.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          {node.children.length > 0 && (
            <p className="mt-5 text-[15px] text-body">
              Shop by type:{" "}
              {node.children.map((c, i) => (
                <span key={c.slug}>
                  {i > 0 && " · "}
                  <Link href={`/c/${c.slug}`} className="text-forest underline underline-offset-2">
                    {c.name}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

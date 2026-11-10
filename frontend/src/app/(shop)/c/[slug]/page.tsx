import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Listing, ListingSkeleton, parseQuery, type SearchParams } from "@/components/listing/listing";
import { findCategory, getCategories } from "@/lib/catalog";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateStaticParams() {
  const tree = await getCategories();
  return tree.flatMap((c) => [c, ...c.children]).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const hit = findCategory(await getCategories(), slug);
  return hit ? { title: hit.node.name, description: `Shop ${hit.node.name.toLowerCase()} at Aks.pk — ${hit.node.description}. Cash on Delivery across Pakistan.` } : {};
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

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-16">
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
    </div>
  );
}

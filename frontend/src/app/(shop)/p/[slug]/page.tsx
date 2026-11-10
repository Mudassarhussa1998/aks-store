import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProductGrid } from "@/components/product/product-card";
import { ProductView } from "@/components/product/product-view";
import { ReviewForm, ReviewList } from "@/components/product/reviews";
import { JsonLd } from "@/components/seo/json-ld";
import { getProduct, getRelated, getReviews, listProducts } from "@/lib/catalog";
import { breadcrumbJsonLd, categoryTrail, productJsonLd, summary } from "@/lib/seo";
import { getCurrentUser } from "@/lib/session";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { items } = await listProducts({ page_size: 60 });
  return items.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return {};
  const from = Math.min(...p.variants.map((v) => v.price));
  const description = summary(`${p.name} from Rs ${from.toLocaleString("en-PK")}. ${p.description} Cash on Delivery across Pakistan.`);
  const images = p.images.slice(0, 4).map((i) => ({ url: `${i.url}-1080.webp`, alt: i.alt || p.name }));
  return {
    title: `${p.name} — ${p.category.name}`,
    description,
    alternates: { canonical: `/p/${p.slug}` },
    openGraph: { title: p.name, description, url: `/p/${p.slug}`, images },
    twitter: { card: "summary_large_image", title: p.name, description, images: images.map((i) => i.url) },
  };
}

// The slug is read inside Suspense so the route can also be rebuilt at runtime after the catalog changes.
export default function ProductPage({ params }: Props) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      {params.then(({ slug }) => (
        <Product slug={slug} />
      ))}
    </Suspense>
  );
}

function ProductSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl animate-pulse gap-10 px-4 pt-12 pb-16 md:grid-cols-2" aria-label="Loading product">
      <div className="aspect-[4/5] rounded-2xl bg-mist" />
      <div className="flex flex-col gap-4">
        <div className="h-9 w-3/4 rounded-lg bg-mist" />
        <div className="h-6 w-1/3 rounded-lg bg-mist" />
        <div className="h-28 rounded-lg bg-mist" />
        <div className="h-12 rounded-full bg-mist" />
      </div>
    </div>
  );
}

async function Product({ slug }: { slug: string }) {
  const product = await getProduct(slug);
  if (!product) notFound();
  const [reviews, related] = await Promise.all([getReviews(slug), getRelated(slug)]);
  const total = product.rating_count;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-16">
      <JsonLd data={productJsonLd(product, reviews.items)} />
      <JsonLd data={breadcrumbJsonLd([...categoryTrail(product.breadcrumbs), { name: product.name, path: `/p/${product.slug}` }])} />
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap gap-2 text-[13px] text-muted">
        <Link href="/">Home</Link>
        {product.breadcrumbs.map((c) => (
          <span key={c.slug} className="flex gap-2">
            <span>/</span>
            <Link href={`/c/${c.slug}`}>{c.name}</Link>
          </span>
        ))}
        <span>/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <ProductView product={product} />

      <section id="reviews" aria-label="Reviews" className="mt-18 scroll-mt-24 border-t border-line pt-12">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="tracking-tight text-3xl font-semibold">Customer reviews</h2>
          <Suspense fallback={null}>
            <ReviewFormForUser slug={slug} />
          </Suspense>
        </div>
        {total === 0 ? (
          <p className="text-muted">No reviews yet. Be the first to share your thoughts.</p>
        ) : (
          <div className="flex flex-wrap gap-12">
            <div className="flex max-w-80 flex-[1_1_260px] flex-col gap-2.5">
              <div className="flex items-baseline gap-2.5">
                <span className="text-5xl">{product.rating_avg.toFixed(1)}</span>
                <span className="text-sm text-muted">
                  out of 5 · {total} {total === 1 ? "review" : "reviews"}
                </span>
              </div>
              {[5, 4, 3, 2, 1].map((n) => {
                const pct = Math.round(((product.rating_breakdown[String(n)] ?? 0) / total) * 100);
                return (
                  <div key={n} className="flex items-center gap-2.5 text-[13px]">
                    <span className="w-7">{n}★</span>
                    <div className="h-2 flex-1 overflow-hidden rounded bg-[#EEEAE3]">
                      <div className="h-full bg-forest" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-9 text-right text-muted">{pct}%</span>
                  </div>
                );
              })}
            </div>
            <div className="min-w-0 flex-[999_1_480px]">
              <ReviewList reviews={reviews.items} />
            </div>
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section aria-label="You may also like" className="mt-12">
          <h2 className="tracking-tight mb-6 text-3xl font-semibold">You may also like</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}

async function ReviewFormForUser({ slug }: { slug: string }) {
  const user = await getCurrentUser();
  return <ReviewForm slug={slug} signedIn={!!user} />;
}

import { SOCIAL } from "@/content/company";

import { absolute, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";
import type { Category, ProductDetail, Review } from "./types";

/** schema.org structured data, so Google can show prices, stock, ratings and breadcrumbs in results. */

export function organizationJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: absolute("/brand/logo-512.png"),
      description: SITE_DESCRIPTION,
      areaServed: "PK",
      ...(SOCIAL.some((s) => s.url) && { sameAs: SOCIAL.filter((s) => s.url).map((s) => s.url) }),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/search?q={search_term_string}`, "query-input": "required name=search_term_string" },
    },
  ];
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absolute(c.path) })),
  };
}

export const categoryTrail = (path: Category[]) => path.map((c) => ({ name: c.name, path: `/c/${c.slug}` }));

// Store rules (see the Delivery and Returns pages): Rs 250 delivery under Rs 3,000, 2–7 days, 7-day returns.
const FREE_DELIVERY_OVER = 3000;
const DELIVERY_FEE = 250;

function shippingDetails(price: number) {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: price >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE, currency: "PKR" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "PK" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 7, unitCode: "DAY" },
    },
  };
}

const RETURN_POLICY = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "PK",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: 7,
  returnMethod: "https://schema.org/ReturnByMail",
};

export function productJsonLd(p: ProductDetail, reviews: Review[]) {
  const prices = p.variants.map((v) => v.price);
  const inStock = p.variants.some((v) => v.stock > 0);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    url: absolute(`/p/${p.slug}`),
    sku: p.variants[0]?.sku,
    image: p.images.map((i) => `${i.url}-1080.webp`),
    brand: { "@type": "Brand", name: "Velenzay" },
    category: p.breadcrumbs.map((c) => c.name).join(" > "),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "PKR",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: p.variants.length,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: absolute(`/p/${p.slug}`),
      seller: { "@type": "Organization", name: SITE_NAME },
      shippingDetails: shippingDetails(Math.min(...prices)),
      hasMerchantReturnPolicy: RETURN_POLICY,
    },
    ...(p.rating_count > 0 && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating_avg.toFixed(1), reviewCount: p.rating_count, bestRating: 5 },
      review: reviews.slice(0, 5).map((r) => ({
        "@type": "Review",
        name: r.title,
        reviewBody: r.body,
        datePublished: r.created_at.slice(0, 10),
        author: { "@type": "Person", name: r.author },
        reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
      })),
    }),
  };
}

/** First sentence-ish of a text, trimmed to a search-friendly length. */
export function summary(text: string, max = 155) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { trackView } from "@/app/actions/account";
import { rs } from "@/lib/format";
import type { OptionKey, ProductDetail, Variant } from "@/lib/types";

import { useCart } from "../cart/cart-store";
import { Stars } from "../ui/icons";
import { WishlistButton } from "../wishlist/wishlist-button";

const OPTION_LABEL: Record<OptionKey, string> = { size: "Size", color: "Colour", quality: "Quality" };
const KEYS: OptionKey[] = ["size", "color", "quality"];

type Selection = Partial<Record<OptionKey, string>>;

const matches = (v: Variant, sel: Selection) => KEYS.every((k) => !sel[k] || v[k] === sel[k]);

export function ProductView({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const cart = useCart();
  const keys = KEYS.filter((k) => product.options[k].length > 0);

  const first = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [sel, setSel] = useState<Selection>(() => Object.fromEntries(keys.map((k) => [k, first?.[k] ?? undefined])));
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    trackView(product.id);
  }, [product.id]);

  const variant = product.variants.find((v) => keys.every((k) => v[k] === sel[k]));

  // Images tagged with the chosen colour come first, then untagged ones.
  const images = useMemo(() => {
    const color = sel.color;
    const tagged = product.images.filter((i) => i.color && i.color === color);
    const rest = product.images.filter((i) => !tagged.includes(i));
    return [...tagged, ...rest];
  }, [product.images, sel.color]);
  const main = images[Math.min(imageIndex, images.length - 1)];

  const pick = (key: OptionKey, value: string) => {
    const next = { ...sel, [key]: value };
    // If that exact combination doesn't exist or is sold out, keep this choice and adjust the others.
    if (!product.variants.some((v) => matches(v, next) && v.stock > 0)) {
      const fallback =
        product.variants.find((v) => v[key] === value && v.stock > 0) ?? product.variants.find((v) => v[key] === value);
      if (fallback) keys.forEach((k) => (next[k] = fallback[k] ?? undefined));
    }
    setSel(next);
    setQty(1);
    if (key === "color") setImageIndex(0);
  };

  const available = (key: OptionKey, value: string) =>
    product.variants.some((v) => v.stock > 0 && matches(v, { ...sel, [key]: value }));

  const addToCart = (goToCheckout: boolean) => {
    if (!variant || variant.stock < 1) return;
    cart.add({
      variantId: variant.id,
      quantity: qty,
      slug: product.slug,
      name: product.name,
      label: keys.map((k) => variant[k]).filter(Boolean).join(" · "),
      price: variant.price,
      image: main?.url ?? null,
    });
    if (goToCheckout) router.push("/checkout");
    else {
      setAdded(true);
      setTimeout(() => setAdded(false), 4000);
    }
  };

  const price = variant?.price ?? Math.min(...product.variants.map((v) => v.price));
  const compare = variant?.compare_at_price;
  const save = compare && compare > price ? Math.round((1 - price / compare) * 100) : 0;
  const stock = variant?.stock ?? 0;
  const maxQty = Math.min(10, stock);

  return (
    <div className="grid items-start gap-12 md:grid-cols-2">
      <section aria-label="Product photos" className="flex flex-col gap-3 md:sticky md:top-24">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-sand">
          {main && (
            <Image key={main.id} src={main.url} alt={main.alt || product.name} fill priority sizes="(max-width: 768px) 100vw, 50vw" className="animate-fade object-cover" />
          )}
        </div>
        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-3">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                aria-label={`Show photo ${i + 1}`}
                aria-current={main?.id === img.id}
                onClick={() => setImageIndex(i)}
                className={`relative aspect-square cursor-pointer overflow-hidden rounded border-2 bg-sand ${main?.id === img.id ? "border-forest" : "border-transparent"}`}
              >
                <Image src={img.url} alt="" fill sizes="120px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Product details" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2.5">
          <span className="text-[13px] tracking-[0.12em] text-muted uppercase">{product.category.name}</span>
          <h1 className="tracking-tight text-4xl leading-tight font-semibold">{product.name}</h1>
          {product.rating_count > 0 && (
            <a href="#reviews" className="text-sm text-body">
              <Stars value={product.rating_avg} /> {product.rating_avg.toFixed(1)} · {product.rating_count} {product.rating_count === 1 ? "review" : "reviews"}
            </a>
          )}
        </div>

        <div className="flex flex-wrap items-baseline gap-3" aria-live="polite">
          <span className="text-3xl font-semibold">{rs(price)}</span>
          {save > 0 && (
            <>
              <span className="text-[17px] text-muted line-through">{rs(compare!)}</span>
              <span className="rounded bg-sale-soft px-2 py-1 text-[13px] font-semibold text-sale">Save {save}%</span>
            </>
          )}
        </div>

        {keys.map((key) => (
          <fieldset key={key} className="flex flex-col gap-2.5">
            <legend className="mb-2.5 text-sm">
              <strong className="font-semibold">{OPTION_LABEL[key]}:</strong> {sel[key]}
            </legend>
            {key === "color" ? (
              <div className="flex flex-wrap gap-3">
                {product.options.color.map((c) => {
                  const hex = product.variants.find((v) => v.color === c)?.color_hex ?? "#ccc";
                  const on = sel.color === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-label={c}
                      title={c}
                      aria-pressed={on}
                      onClick={() => pick("color", c)}
                      className={`relative h-11 w-11 cursor-pointer rounded-full border-[3px] border-white ${on ? "ring-2 ring-forest" : "ring-1 ring-line-strong"} ${available("color", c) ? "" : "opacity-40"}`}
                      style={{ background: hex }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className={key === "quality" ? "grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2" : "flex flex-wrap gap-2"}>
                {product.options[key].map((value) => {
                  const on = sel[key] === value;
                  const ok = available(key, value);
                  if (key === "quality") {
                    const prices = product.variants.filter((v) => matches(v, { ...sel, quality: value })).map((v) => v.price);
                    const delta = prices.length ? Math.min(...prices) - price : 0;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={on}
                        onClick={() => pick(key, value)}
                        className={`cursor-pointer rounded px-3.5 py-3 text-left ${on ? "border-2 border-forest bg-sand" : "border border-line bg-white"} ${ok ? "" : "opacity-50"}`}
                      >
                        <span className="block text-sm font-semibold">{value}</span>
                        <span className="mt-1 block text-[13px] text-body">
                          {on ? "Selected" : delta === 0 ? "Same price" : `${delta > 0 ? "+" : "−"} ${rs(Math.abs(delta))}`}
                        </span>
                      </button>
                    );
                  }
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => pick(key, value)}
                      className={`min-h-11 min-w-20 cursor-pointer rounded border px-4 text-sm ${on ? "border-forest bg-forest text-white" : "border-line bg-white"} ${ok ? "" : "text-muted line-through decoration-1"}`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>
        ))}

        <div className="flex items-center gap-2 text-sm" aria-live="polite">
          <span className={`h-2 w-2 rounded-full ${stock < 1 ? "bg-sale" : stock <= 3 ? "bg-warn" : "bg-ok"}`} />
          <span className={stock < 1 ? "text-sale" : stock <= 3 ? "text-warn" : "text-ok"}>
            {stock < 1 ? "Sold out in this combination" : stock <= 3 ? `Only ${stock} left` : "In stock · ships in 1–2 days"}
          </span>
          {variant && <span className="ml-auto text-xs text-muted">SKU {variant.sku}</span>}
        </div>

        <div className="flex flex-wrap items-stretch gap-3">
          <div className="flex items-center rounded border border-line">
            <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-[52px] w-11 cursor-pointer text-xl">
              −
            </button>
            <span aria-live="polite" className="min-w-8 text-center font-semibold">
              {qty}
            </span>
            <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(maxQty || 1, q + 1))} className="h-[52px] w-11 cursor-pointer text-xl">
              +
            </button>
          </div>
          <button
            type="button"
            disabled={stock < 1}
            onClick={() => addToCart(false)}
            className="min-h-[52px] flex-[1_1_200px] cursor-pointer rounded bg-forest text-[15px] font-medium text-white disabled:cursor-not-allowed disabled:bg-line-strong"
          >
            {stock < 1 ? "Sold out" : `Add to cart · ${rs(price * qty)}`}
          </button>
          <WishlistButton productId={product.id} bordered className="h-auto w-[52px]" />
        </div>
        <button
          type="button"
          disabled={stock < 1}
          onClick={() => addToCart(true)}
          className="-mt-3 min-h-[52px] cursor-pointer rounded border border-ink text-[15px] font-medium disabled:cursor-not-allowed disabled:opacity-40"
        >
          Buy now — Cash on Delivery
        </button>
        {added && (
          <div role="status" className="flex animate-rise items-center justify-between gap-3 rounded-lg bg-forest px-4 py-3 text-sm text-white">
            Added to your cart.
            <Link href="/cart" className="font-semibold text-white underline hover:text-white">
              View cart ({cart.count})
            </Link>
          </div>
        )}

        <dl className="grid gap-3 rounded-lg bg-sand px-5 py-4 text-sm">
          {[
            ["Cash on Delivery", "Pay when your parcel arrives"],
            ["Delivery", "2–4 working days · free over Rs 3,000"],
            ["Returns", "7-day easy returns on unused items"],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-wrap gap-x-3">
              <dt className="min-w-36 font-semibold">{k}</dt>
              <dd className="text-body">{v}</dd>
            </div>
          ))}
        </dl>

        {product.description && (
          <details open className="border-t border-line pt-4">
            <summary className="cursor-pointer text-[15px] font-semibold">Description</summary>
            <p className="mt-3 text-sm leading-relaxed text-body">{product.description}</p>
          </details>
        )}
        {product.material_care && (
          <details className="border-t border-line pt-4">
            <summary className="cursor-pointer text-[15px] font-semibold">Material &amp; care</summary>
            <p className="mt-3 text-sm leading-relaxed text-body">{product.material_care}</p>
          </details>
        )}
      </section>
    </div>
  );
}

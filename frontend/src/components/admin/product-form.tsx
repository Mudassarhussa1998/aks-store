"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { archiveProduct, saveProduct } from "@/app/actions/admin";

import type { AdminCategory, AdminProduct, ImageInput, ProductInput, VariantInput } from "./types";
import { Card, inputClass, labelClass, td, th } from "./ui";

type Row = VariantInput & { key: string };

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 160);
const code = (s: string | null, n: number) => (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, n);
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function parseColors(s: string) {
  return list(s).map((part) => {
    const m = part.match(/^(.*?)\s*(#[0-9a-f]{6})?$/i);
    return { name: (m?.[1] || part).trim(), hex: m?.[2]?.toUpperCase() ?? null };
  });
}

function parseQualities(s: string) {
  return list(s).map((part) => {
    const m = part.match(/^(.*?)\s*(?:\+\s*(\d+))?$/);
    return { name: (m?.[1] || part).trim(), add: Number(m?.[2] ?? 0) };
  });
}

let nextKey = 0;
const rowKey = () => `r${nextKey++}`;

function initialOptions(p?: AdminProduct) {
  if (!p) return { sizes: "", colors: "", qualities: "", base: 0, prefix: "" };
  const hex = (c: string) => p.variants.find((v) => v.color === c)?.color_hex ?? "";
  const min = Math.min(...p.variants.map((v) => v.price));
  const minFor = (q: string) => Math.min(...p.variants.filter((v) => v.quality === q).map((v) => v.price));
  const firstQ = p.options.quality[0];
  const base = firstQ ? minFor(firstQ) : min;
  return {
    sizes: p.options.size.join(", "),
    colors: p.options.color.map((c) => `${c} ${hex(c)}`.trim()).join(", "),
    qualities: p.options.quality.map((q) => `${q} +${Math.max(0, minFor(q) - base)}`).join(", "),
    base,
    prefix: p.variants[0]?.sku.split("-").slice(0, 2).join("-") ?? "",
  };
}

export function ProductForm({ product, categories }: { product?: AdminProduct; categories: AdminCategory[] }) {
  const router = useRouter();
  const opts = initialOptions(product);
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [categoryId, setCategoryId] = useState<number | "">(product?.category_id ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [care, setCare] = useState(product?.material_care ?? "");
  const [badge, setBadge] = useState(product?.badge ?? "");
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);
  const [images, setImages] = useState<ImageInput[]>(
    product?.images.map((i) => ({ url: i.url, alt: i.alt, color: i.color })) ?? [],
  );
  const [sizes, setSizes] = useState(opts.sizes);
  const [colors, setColors] = useState(opts.colors);
  const [qualities, setQualities] = useState(opts.qualities);
  const [basePrice, setBasePrice] = useState(opts.base);
  const [prefix, setPrefix] = useState(opts.prefix);
  const [rows, setRows] = useState<Row[]>(product?.variants.map((v) => ({ ...v, key: rowKey() })) ?? []);
  const [uploading, setUploading] = useState(0);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSave] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const colorList = parseColors(colors);
  const skuPrefix = prefix || `RWJ-${code(slug.split("-").map((w) => w[0]).join(""), 4) || "PRD"}`;

  function onName(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function generate() {
    const s: (string | null)[] = list(sizes).length ? list(sizes) : [null];
    const c = colorList.length ? colorList : [{ name: null, hex: null }];
    const q = parseQualities(qualities).length ? parseQualities(qualities) : [{ name: null, add: 0 }];
    const next: Row[] = [];
    for (const size of s)
      for (const color of c)
        for (const quality of q) {
          const existing = rows.find((r) => r.size === size && r.color === color.name && r.quality === quality.name);
          const sku = [skuPrefix, code(size, 6), code(color.name, 4), code(quality.name, 1)].filter(Boolean).join("-");
          next.push({
            key: existing?.key ?? rowKey(),
            id: existing?.id ?? null,
            sku: existing?.sku ?? sku,
            size,
            color: color.name,
            color_hex: color.hex,
            quality: quality.name,
            price: basePrice + quality.add || existing?.price || 0,
            compare_at_price: existing?.compare_at_price ?? null,
            stock: existing?.stock ?? 0,
          });
        }
    setRows(next);
  }

  const updateRow = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setMessage(null);
    for (const file of Array.from(files)) {
      setUploading((n) => n + 1);
      const body = new FormData();
      body.append("file", file);
      try {
        const res = await fetch("/admin/api/upload", { method: "POST", body });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
        setImages((imgs) => [...imgs, { url: data.url!, alt: name, color: null }]);
      } catch (e) {
        setMessage({ ok: false, text: `${file.name}: ${e instanceof Error ? e.message : "upload failed"}` });
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  function moveImage(i: number, dir: -1 | 1) {
    setImages((imgs) => {
      const j = i + dir;
      if (j < 0 || j >= imgs.length) return imgs;
      const copy = [...imgs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  function validate(): string | null {
    if (name.trim().length < 2) return "Enter a product name.";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return "The URL slug can only use lowercase letters, numbers and dashes.";
    if (!categoryId) return "Choose a category.";
    if (!rows.length) return "Add at least one variant (use Generate combinations).";
    const skus = rows.map((r) => r.sku.trim());
    if (skus.some((s) => s.length < 2)) return "Every variant needs a SKU.";
    if (new Set(skus).size !== skus.length) return "SKUs must be unique.";
    if (rows.some((r) => !(r.price > 0))) return "Every variant needs a price above 0.";
    if (rows.some((r) => r.compare_at_price !== null && r.compare_at_price <= r.price))
      return "Compare-at price must be higher than the price (or left empty).";
    return null;
  }

  function save() {
    const problem = validate();
    if (problem) return setMessage({ ok: false, text: problem });
    const payload: ProductInput = {
      name: name.trim(),
      slug,
      category_id: Number(categoryId),
      description,
      material_care: care,
      badge: badge || null,
      is_active: isActive,
      is_featured: isFeatured,
      images: images.map((i) => ({ ...i, alt: i.alt || name })),
      variants: rows.map((r) => ({
        id: r.id ?? null,
        sku: r.sku.trim(),
        size: r.size,
        color: r.color,
        color_hex: r.color_hex,
        quality: r.quality,
        price: r.price,
        compare_at_price: r.compare_at_price,
        stock: r.stock,
      })),
    };
    setMessage(null);
    startSave(async () => {
      const res = await saveProduct(product?.id ?? null, payload);
      if (!res.ok) return setMessage({ ok: false, text: res.error });
      if (!product) router.replace(`/admin/products/${res.data.id}`);
      else {
        setRows(res.data.variants.map((v) => ({ ...v, key: rowKey() })));
        setMessage({ ok: true, text: "Saved. The store updates within a minute." });
      }
    });
  }

  function archive() {
    if (!product || !confirm(`Hide "${product.name}" from the store? Past orders keep their details.`)) return;
    startSave(async () => {
      const res = await archiveProduct(product.id);
      if (!res.ok) setMessage({ ok: false, text: res.error });
      else router.push("/admin/products");
    });
  }

  const sortedCats = [...categories].sort((a, b) => a.sort_order - b.sort_order);
  const catLabel = (c: AdminCategory) => {
    const parent = categories.find((p) => p.id === c.parent_id);
    return parent ? `${parent.name} › ${c.name}` : c.name;
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <Card title="Details">
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <label className={labelClass}>
            Name
            <input className={inputClass} value={name} onChange={(e) => onName(e.target.value)} required />
          </label>
          <label className={labelClass}>
            URL slug
            <input
              className={inputClass}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
            />
            <span className="text-xs font-normal text-muted">rawaj.pk/p/{slug || "…"}</span>
          </label>
          <label className={labelClass}>
            Category
            <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}>
              <option value="">Choose…</option>
              {sortedCats.map((c) => (
                <option key={c.id} value={c.id}>{catLabel(c)}</option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Badge
            <select className={inputClass} value={badge} onChange={(e) => setBadge(e.target.value)}>
              <option value="">None (Sale shows automatically when discounted)</option>
              <option value="New">New</option>
              <option value="Bestseller">Bestseller</option>
            </select>
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            Description
            <textarea className={inputClass} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            Material &amp; care
            <textarea className={inputClass} rows={2} value={care} onChange={(e) => setCare(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Visible in store</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} /> Featured (shown first)</label>
          </div>
        </div>
      </Card>

      <Card
        title={`Photos (${images.length})`}
        actions={
          <label className="cursor-pointer rounded border border-line-strong bg-white px-3 py-2 text-sm font-medium hover:border-ink">
            {uploading ? `Uploading ${uploading}…` : "Upload photos"}
            <input ref={fileInput} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => upload(e.target.files)} />
          </label>
        }
      >
        <div className="p-5">
          {images.length === 0 ? (
            <p className="text-sm text-muted">No photos yet. The first photo is the main one shown in listings. Photos are resized automatically.</p>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
              {images.map((img, i) => (
                <li key={img.url} className="flex flex-col gap-2 rounded border border-line p-2">
                  <div className="relative aspect-[3/4] overflow-hidden rounded bg-mist">
                    <Image src={img.url} alt={img.alt} fill sizes="180px" className="object-cover" />
                    {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-0.5 text-xs font-semibold">Main</span>}
                  </div>
                  <label className="text-xs font-medium">
                    Show for colour
                    <select
                      className={`${inputClass} mt-1 py-1.5`}
                      value={img.color ?? ""}
                      onChange={(e) => setImages((imgs) => imgs.map((x, j) => (j === i ? { ...x, color: e.target.value || null } : x)))}
                    >
                      <option value="">All colours</option>
                      {colorList.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </label>
                  <div className="flex justify-between text-xs">
                    <span className="flex gap-1">
                      <button type="button" aria-label="Move earlier" onClick={() => moveImage(i, -1)} disabled={i === 0} className="rounded border border-line px-2 py-1 disabled:opacity-40">←</button>
                      <button type="button" aria-label="Move later" onClick={() => moveImage(i, 1)} disabled={i === images.length - 1} className="rounded border border-line px-2 py-1 disabled:opacity-40">→</button>
                    </span>
                    <button type="button" onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))} className="px-2 py-1 text-sale underline">Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card title={`Variants (${rows.length})`}>
        <div className="grid gap-4 border-b border-line p-5 md:grid-cols-2 xl:grid-cols-3">
          <label className={labelClass}>
            Sizes
            <input className={inputClass} value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="Single, Double, King" />
          </label>
          <label className={labelClass}>
            Colours (name and hex)
            <input className={inputClass} value={colors} onChange={(e) => setColors(e.target.value)} placeholder="Ivory #EAE3D6, Charcoal #4A4A4A" />
            <span className="flex flex-wrap gap-1.5">
              {colorList.map((c) => (
                <span key={c.name} title={c.name} className="h-4 w-4 rounded-full ring-1 ring-line-strong" style={{ background: c.hex ?? "#fff" }} />
              ))}
            </span>
          </label>
          <label className={labelClass}>
            Qualities (with price add-on)
            <input className={inputClass} value={qualities} onChange={(e) => setQualities(e.target.value)} placeholder="Standard +0, Premium +1500" />
          </label>
          <label className={labelClass}>
            Base price (Rs)
            <input type="number" min={0} className={inputClass} value={basePrice || ""} onChange={(e) => setBasePrice(Number(e.target.value))} />
          </label>
          <label className={labelClass}>
            SKU prefix
            <input className={inputClass} value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} placeholder={skuPrefix} />
          </label>
          <div className="flex items-end">
            <button type="button" onClick={generate} className="w-full rounded bg-ink px-4 py-2.5 text-sm font-medium text-white">
              Generate combinations
            </button>
          </div>
          <p className="text-xs text-muted md:col-span-2 xl:col-span-3">
            Leave a list empty if the product has no such option. Generating keeps stock and SKUs of existing combinations and sets
            each price to base + quality add-on; adjust any row below afterwards.
          </p>
        </div>
        {rows.length > 0 && (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className={th}>Size</th>
                  <th className={th}>Colour</th>
                  <th className={th}>Quality</th>
                  <th className={th}>SKU</th>
                  <th className={th}>Price</th>
                  <th className={th}>Compare at</th>
                  <th className={th}>Stock</th>
                  <th className={th}><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-t border-line">
                    <td className={td}>{r.size ?? "—"}</td>
                    <td className={td}>
                      <span className="inline-flex items-center gap-2">
                        {r.color_hex && <span className="h-3.5 w-3.5 rounded-full ring-1 ring-line-strong" style={{ background: r.color_hex }} />}
                        {r.color ?? "—"}
                      </span>
                    </td>
                    <td className={td}>{r.quality ?? "—"}</td>
                    <td className={td}>
                      <input aria-label={`SKU for ${r.sku}`} className={`${inputClass} w-44 font-mono text-xs`} value={r.sku} onChange={(e) => updateRow(r.key, { sku: e.target.value })} />
                    </td>
                    <td className={td}>
                      <input aria-label={`Price for ${r.sku}`} type="number" min={1} className={`${inputClass} w-28`} value={r.price || ""} onChange={(e) => updateRow(r.key, { price: Number(e.target.value) })} />
                    </td>
                    <td className={td}>
                      <input aria-label={`Compare-at price for ${r.sku}`} type="number" min={1} className={`${inputClass} w-28`} value={r.compare_at_price ?? ""} onChange={(e) => updateRow(r.key, { compare_at_price: e.target.value ? Number(e.target.value) : null })} />
                    </td>
                    <td className={td}>
                      <input
                        aria-label={`Stock for ${r.sku}`}
                        type="number"
                        min={0}
                        className={`${inputClass} w-20 ${r.stock <= 3 ? "border-[#C7745A]" : ""} ${r.stock === 0 ? "bg-[#FBEDE9]" : ""}`}
                        value={r.stock}
                        onChange={(e) => updateRow(r.key, { stock: Math.max(0, Number(e.target.value)) })}
                      />
                    </td>
                    <td className={td}>
                      <button type="button" aria-label={`Remove ${r.sku}`} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="px-2 text-sale">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="flex flex-wrap items-center justify-end gap-3">
          {message && (
            <p role={message.ok ? "status" : "alert"} className={`mr-auto text-sm ${message.ok ? "text-ok" : "text-sale"}`}>
              {message.text}
            </p>
          )}
          {product?.is_active && (
            <button type="button" onClick={archive} disabled={saving} className="rounded-full border border-line-strong px-5 py-2.5 text-sm font-medium text-sale">
              Hide from store
            </button>
          )}
          <button type="button" onClick={save} disabled={saving || uploading > 0} className="rounded-full bg-forest px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60">
            {saving ? "Saving…" : product ? "Save changes" : "Create product"}
          </button>
        </div>
      </div>
    </div>
  );
}

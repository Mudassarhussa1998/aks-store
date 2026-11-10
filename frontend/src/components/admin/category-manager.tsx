"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";

import { deleteCategory, reorderCategories, saveCategory } from "@/app/actions/admin";

import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from "../ui/icons";
import type { AdminCategory, CategoryInput } from "./types";
import { buttonClass, Card, inputClass, labelClass } from "./ui";

const EMPTY: CategoryInput = { name: "", slug: "", description: "", image_url: null, parent_id: null, sort_order: 0, is_active: true };
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const byOrder = (a: AdminCategory, b: AdminCategory) => a.sort_order - b.sort_order || a.name.localeCompare(b.name);

export function CategoryManager({ categories }: { categories: AdminCategory[] }) {
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState<CategoryInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  const roots = categories.filter((c) => !c.parent_id).sort(byOrder);
  const childrenOf = (id: number | null) => categories.filter((c) => c.parent_id === id).sort(byOrder);
  const siblings = (c: AdminCategory) => (c.parent_id ? childrenOf(c.parent_id) : roots);

  function edit(c: AdminCategory | null, parentId: number | null = null) {
    setEditing(c);
    setError(null);
    setForm(
      c
        ? { name: c.name, slug: c.slug, description: c.description, image_url: c.image_url, parent_id: c.parent_id, sort_order: c.sort_order, is_active: c.is_active }
        : { ...EMPTY, parent_id: parentId },
    );
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/admin/api/upload", { method: "POST", body });
    const data = (await res.json()) as { url?: string; error?: string };
    setUploading(false);
    if (data.url) setForm((f) => ({ ...f, image_url: data.url! }));
    else setError(data.error ?? "Upload failed");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // A new category goes to the end of its group; moving one to another group also puts it last there.
    const moved = !editing || editing.parent_id !== form.parent_id;
    const sort_order = moved ? childrenOf(form.parent_id).filter((c) => c.id !== editing?.id).length : form.sort_order;
    start(async () => {
      const res = await saveCategory(editing?.id ?? null, { ...form, sort_order });
      if (!res.ok) setError(res.error);
      else edit(null);
    });
  }

  const move = (c: AdminCategory, dir: -1 | 1) => {
    const list = siblings(c).map((x) => x.id);
    const i = list.indexOf(c.id);
    [list[i], list[i + dir]] = [list[i + dir], list[i]];
    start(async () => {
      setListError(null);
      const res = await reorderCategories(list);
      if (!res.ok) setListError(res.error);
    });
  };

  const remove = (c: AdminCategory) => {
    if (!confirm(`Delete "${c.name}"? This can't be undone.`)) return;
    start(async () => {
      setListError(null);
      const res = await deleteCategory(c.id);
      if (!res.ok) setListError(res.error);
      else if (editing?.id === c.id) edit(null);
    });
  };

  const row = (c: AdminCategory, child: boolean) => {
    const sibs = siblings(c);
    const index = sibs.findIndex((x) => x.id === c.id);
    const blocked = c.child_count > 0 ? "Has sub-categories" : c.product_count > 0 ? `Has ${c.product_count} product${c.product_count === 1 ? "" : "s"}` : null;
    return (
      <li key={c.id} className={`flex items-center gap-3 border-t border-line py-2.5 pr-3 ${child ? "pl-12" : "pl-4"} ${editing?.id === c.id ? "bg-forest/5" : ""}`}>
        <span className={`relative shrink-0 overflow-hidden rounded-full bg-mist ${child ? "h-8 w-8" : "h-10 w-10"} ${c.is_active ? "" : "opacity-50"}`}>
          {c.image_url && <Image src={c.image_url} alt="" fill sizes="40px" className="object-cover" />}
        </span>
        <button type="button" onClick={() => edit(c)} className="flex min-w-0 flex-1 cursor-pointer flex-col text-left">
          <span className={`truncate ${child ? "" : "font-semibold"}`}>
            {c.name}
            {!c.is_active && <span className="ml-2 rounded-full bg-line px-2 py-0.5 text-[11px] font-medium text-body">Hidden</span>}
          </span>
          <span className="truncate text-xs text-muted">
            /c/{c.slug} · {c.product_count} {c.product_count === 1 ? "product" : "products"}
            {!child && ` · ${c.child_count} sub-categor${c.child_count === 1 ? "y" : "ies"}`}
          </span>
        </button>
        <span className="flex shrink-0 items-center">
          <button type="button" aria-label={`Move ${c.name} up`} disabled={pending || index === 0} onClick={() => move(c, -1)} className={`${buttonClass.ghost} px-2 disabled:invisible`}>
            <ArrowUpIcon size={15} />
          </button>
          <button type="button" aria-label={`Move ${c.name} down`} disabled={pending || index === sibs.length - 1} onClick={() => move(c, 1)} className={`${buttonClass.ghost} px-2 disabled:invisible`}>
            <ArrowDownIcon size={15} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${c.name}`}
            title={blocked ? `${blocked}, so it can't be deleted. Hide it instead.` : "Delete"}
            disabled={pending || !!blocked}
            onClick={() => remove(c)}
            className={`${buttonClass.ghost} px-2 text-sale disabled:text-line-strong`}
          >
            <TrashIcon size={16} />
          </button>
        </span>
      </li>
    );
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card
        title="All categories"
        actions={
          <button type="button" onClick={() => edit(null)} className={buttonClass.secondary}>
            + New category
          </button>
        }
      >
        {listError && (
          <p role="alert" className="bg-sale-soft px-4 py-2.5 text-sm text-sale">
            {listError}
          </p>
        )}
        <ul className={`transition-opacity ${pending ? "opacity-60" : ""} [&>li:first-child]:border-t-0`}>
          {roots.map((r) => [
            row(r, false),
            ...childrenOf(r.id).map((c) => row(c, true)),
            <li key={`add-${r.id}`} className="border-t border-line py-1.5 pl-12">
              <button type="button" onClick={() => edit(null, r.id)} className="cursor-pointer text-sm text-forest hover:underline">
                + Add to {r.name}
              </button>
            </li>,
          ])}
        </ul>
      </Card>

      <Card title={editing ? `Edit ${editing.name}` : form.parent_id ? `New in ${roots.find((r) => r.id === form.parent_id)?.name}` : "New category"}>
        <form onSubmit={submit} className="flex flex-col gap-4 p-5">
          <label className={labelClass}>
            Name
            <input className={inputClass} required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: editing ? f.slug : slugify(e.target.value) }))} />
          </label>
          <label className={labelClass}>
            Web address
            <span className="flex items-center rounded-xl border border-line-strong bg-mist/60 pl-3 text-sm text-muted focus-within:border-forest">
              /c/
              <input className="min-w-0 flex-1 rounded-r-xl bg-white px-2 py-2.5 text-ink outline-none" required value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))} />
            </span>
          </label>
          <label className={labelClass}>
            Parent
            <select
              className={inputClass}
              value={form.parent_id ?? ""}
              disabled={!!editing && editing.child_count > 0}
              onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value ? Number(e.target.value) : null }))}
            >
              <option value="">None (shows in the main menu)</option>
              {roots
                .filter((r) => r.id !== editing?.id)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
            {editing && editing.child_count > 0 && <span className="text-xs font-normal text-muted">It has sub-categories, so it stays top-level.</span>}
          </label>
          <label className={labelClass}>
            Short description
            <input className={inputClass} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. Single to King" />
          </label>
          <div className={labelClass}>
            Image
            <div className="flex items-center gap-3">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-mist">
                {form.image_url && <Image src={form.image_url} alt="" fill sizes="56px" className="object-cover" />}
              </span>
              <label className={buttonClass.secondary}>
                {uploading ? "Uploading…" : form.image_url ? "Replace" : "Upload"}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
              </label>
              {form.image_url && (
                <button type="button" onClick={() => setForm((f) => ({ ...f, image_url: null }))} className={buttonClass.ghost}>
                  Remove
                </button>
              )}
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 accent-forest" />
            Visible in store
          </label>
          {error && (
            <p role="alert" className="rounded-xl bg-sale-soft px-3 py-2.5 text-sm text-sale">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={pending || uploading} className={buttonClass.primary}>
              {pending ? "Saving…" : editing ? "Save category" : "Create category"}
            </button>
            {editing && (
              <>
                <Link href={`/admin/products?category_id=${editing.id}`} className="text-sm text-forest hover:underline">
                  View its products
                </Link>
                <button type="button" onClick={() => edit(null)} className={`${buttonClass.ghost} ml-auto`}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}

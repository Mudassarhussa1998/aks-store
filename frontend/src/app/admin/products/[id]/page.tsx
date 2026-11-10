import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProductForm } from "@/components/admin/product-form";
import { DuplicateButton } from "@/components/admin/product-table";
import { adminApi } from "@/components/admin/server";
import type { AdminCategory, AdminProduct } from "@/components/admin/types";
import { PageHeader, TableSkeleton } from "@/components/admin/ui";
import { ApiError } from "@/lib/api";

export default function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  return (
    <>
      <Link href="/admin/products" className="mb-4 inline-block text-sm text-forest hover:underline">← Products</Link>
      <Suspense fallback={<TableSkeleton />}>
        <EditProduct params={params} />
      </Suspense>
    </>
  );
}

async function EditProduct({ params }: Pick<PageProps<"/admin/products/[id]">, "params">) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  let product: AdminProduct;
  try {
    product = await adminApi<AdminProduct>(`/products/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const categories = await adminApi<AdminCategory[]>("/categories");
  return (
    <>
      <PageHeader
        title={product.name}
        subtitle={product.is_active ? undefined : "Hidden from the store. Tick “Visible in store” below to publish it."}
        actions={
          <>
            <DuplicateButton id={product.id} />
            {product.is_active && (
              <Link href={`/p/${product.slug}`} className="rounded-full border border-line-strong bg-white px-5 py-2.5 text-sm font-medium">
                View in store
              </Link>
            )}
          </>
        }
      />
      {/* key: remount with fresh state when navigating between products */}
      <ProductForm key={product.id} product={product} categories={categories} />
    </>
  );
}

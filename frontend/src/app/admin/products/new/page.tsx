import Link from "next/link";
import { Suspense } from "react";

import { ProductForm } from "@/components/admin/product-form";
import { adminApi } from "@/components/admin/server";
import type { AdminCategory } from "@/components/admin/types";
import { PageHeader, TableSkeleton } from "@/components/admin/ui";

export default function NewProductPage() {
  return (
    <>
      <Link href="/admin/products" className="mb-4 inline-block text-sm underline">← Products</Link>
      <PageHeader title="Add product" subtitle="Add photos, then generate a variant for every size × colour × quality." />
      <Suspense fallback={<TableSkeleton />}>
        <NewProduct />
      </Suspense>
    </>
  );
}

async function NewProduct() {
  const categories = await adminApi<AdminCategory[]>("/categories");
  return <ProductForm categories={categories} />;
}

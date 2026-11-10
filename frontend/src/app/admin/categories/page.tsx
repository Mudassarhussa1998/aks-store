import { Suspense } from "react";

import { CategoryManager } from "@/components/admin/category-manager";
import { adminApi } from "@/components/admin/server";
import type { AdminCategory } from "@/components/admin/types";
import { PageHeader, TableSkeleton } from "@/components/admin/ui";

export default function CategoriesPage() {
  return (
    <>
      <PageHeader title="Categories" subtitle="Top-level categories make up the main menu. Use the arrows to change their order." />
      <Suspense fallback={<TableSkeleton />}>
        <Categories />
      </Suspense>
    </>
  );
}

async function Categories() {
  return <CategoryManager categories={await adminApi<AdminCategory[]>("/categories")} />;
}

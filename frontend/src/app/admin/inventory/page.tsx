import { Suspense } from "react";

import { InventoryTable } from "@/components/admin/inventory-table";
import { ListFilters } from "@/components/admin/list-filters";
import { adminApi } from "@/components/admin/server";
import type { AdminCategory, InventoryPage } from "@/components/admin/types";
import { Card, FilterTabs, PageHeader, Pagination, TableSkeleton } from "@/components/admin/ui";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function InventoryPageRoute({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <>
      <PageHeader title="Inventory" subtitle="Stock for every size, colour and quality. Edit the numbers, then save." />
      <Suspense fallback={<TableSkeleton />}>
        <Inventory searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Inventory({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const query = { q: one(sp.q), stock: one(sp.stock) || "low", category_id: one(sp.category_id), page: Math.max(1, Number(one(sp.page)) || 1) };
  const [data, categories] = await Promise.all([
    adminApi<InventoryPage>("/inventory", { ...query, q: query.q || undefined, category_id: query.category_id || undefined }),
    adminApi<AdminCategory[]>("/categories"),
  ]);
  const href = (changes: Record<string, string | number>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...query, page: "", ...changes })) if (v && !(k === "stock" && v === "low")) qs.set(k, String(v));
    const s = qs.toString();
    return s ? `/admin/inventory?${s}` : "/admin/inventory";
  };
  const roots = categories.filter((c) => !c.parent_id);

  return (
    <div className="flex flex-col gap-4">
      <FilterTabs
        tabs={[
          { href: href({ stock: "low" }), label: `Running low (${data.low_threshold} or fewer)`, active: query.stock === "low" },
          { href: href({ stock: "out" }), label: "Out of stock", active: query.stock === "out" },
          { href: href({ stock: "all" }), label: "All", active: query.stock === "all" },
        ]}
      />
      <Card>
        <div className="border-b border-line p-3">
          <ListFilters
            placeholder="Search by product or SKU"
            selects={[
              {
                name: "category_id",
                label: "Category",
                options: [
                  { value: "", label: "All categories" },
                  ...roots.flatMap((r) => [
                    { value: String(r.id), label: r.name },
                    ...categories.filter((c) => c.parent_id === r.id).map((c) => ({ value: String(c.id), label: `  ${r.name} › ${c.name}` })),
                  ]),
                ],
              },
            ]}
          />
        </div>
        {/* key: drop unsaved edits when the list changes underneath them */}
        <InventoryTable key={JSON.stringify(query)} items={data.items} lowThreshold={data.low_threshold} />
        <Pagination page={data.page} pages={data.pages} href={(n) => href({ page: n })} />
      </Card>
      <p className="text-sm text-muted">
        {data.total} {data.total === 1 ? "option" : "options"}
      </p>
    </div>
  );
}

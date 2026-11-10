import { Suspense } from "react";

import { ListFilters } from "@/components/admin/list-filters";
import { ProductTable } from "@/components/admin/product-table";
import { adminApi } from "@/components/admin/server";
import type { AdminCategory, AdminProductList } from "@/components/admin/types";
import { ButtonLink, Card, FilterTabs, PageHeader, Pagination, TableSkeleton } from "@/components/admin/ui";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  return (
    <>
      <PageHeader title="Products" actions={<ButtonLink href="/admin/products/new" primary>+ Add product</ButtonLink>} />
      <Suspense fallback={<TableSkeleton />}>
        <Products searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Products({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const query = {
    q: one(sp.q),
    status: one(sp.status) || "all",
    category_id: one(sp.category_id),
    stock: one(sp.stock),
    sort: one(sp.sort),
    page: Math.max(1, Number(one(sp.page)) || 1),
  };
  const [data, categories] = await Promise.all([
    adminApi<AdminProductList>("/products", { ...query, q: query.q || undefined, category_id: query.category_id || undefined, stock: query.stock || undefined, sort: query.sort || undefined }),
    adminApi<AdminCategory[]>("/categories"),
  ]);

  const href = (changes: Record<string, string | number>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...query, page: "", ...changes })) if (v && !(k === "status" && v === "all")) qs.set(k, String(v));
    const s = qs.toString();
    return s ? `/admin/products?${s}` : "/admin/products";
  };
  const roots = categories.filter((c) => !c.parent_id);

  return (
    <div className="flex flex-col gap-4">
      <FilterTabs
        tabs={[
          { href: href({ status: "all" }), label: "All", count: data.counts.all, active: query.status === "all" },
          { href: href({ status: "active" }), label: "Visible", count: data.counts.active, active: query.status === "active" },
          { href: href({ status: "hidden" }), label: "Hidden", count: data.counts.hidden, active: query.status === "hidden" },
          { href: href({ status: "featured" }), label: "Featured", active: query.status === "featured" },
        ]}
      />
      <Card>
        <div className="border-b border-line p-3">
          <ListFilters
            placeholder="Search by name or SKU"
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
              {
                name: "stock",
                label: "Stock",
                options: [
                  { value: "", label: "Any stock" },
                  { value: "in", label: "In stock" },
                  { value: "low", label: "Running low" },
                  { value: "out", label: `Out of stock (${data.counts.out_of_stock})` },
                ],
              },
              {
                name: "sort",
                label: "Sort",
                options: [
                  { value: "", label: "Newest first" },
                  { value: "oldest", label: "Oldest first" },
                  { value: "name", label: "Name A–Z" },
                  { value: "price_asc", label: "Price: low to high" },
                  { value: "price_desc", label: "Price: high to low" },
                  { value: "stock_asc", label: "Least stock first" },
                ],
              },
            ]}
          />
        </div>
        {/* key: clear the selection whenever the filters or page change */}
        <ProductTable key={JSON.stringify(query)} items={data.items} />
        <Pagination page={data.page} pages={data.pages} href={(n) => href({ page: n })} />
      </Card>
      <p className="text-sm text-muted">
        {data.total} {data.total === 1 ? "product" : "products"}
      </p>
    </div>
  );
}

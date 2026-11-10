import { Suspense } from "react";

import { adminApi } from "@/components/admin/server";
import type { Customer } from "@/components/admin/types";
import { Card, inputClass, PageHeader, TableSkeleton, td, th } from "@/components/admin/ui";
import { date, rs } from "@/lib/format";

export default function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  return (
    <>
      <PageHeader title="Customers" subtitle="Registered accounts. Guest checkouts appear only in Orders." />
      <Suspense fallback={<TableSkeleton />}>
        <Customers searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Customers({ searchParams }: Pick<PageProps<"/admin/customers">, "searchParams">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const customers = await adminApi<Customer[]>("/customers", { q: q || undefined });
  return (
    <Card
      actions={
        <form className="flex gap-2" action="/admin/customers">
          <label className="sr-only" htmlFor="customer-q">Search customers</label>
          <input id="customer-q" name="q" defaultValue={q} placeholder="Name, email or phone" className={`${inputClass} w-60`} />
          <button className="rounded-full bg-ink px-5 text-sm font-medium text-white">Search</button>
        </form>
      }
    >
      {customers.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted">No customers found.</p>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr><th className={th}>Name</th><th className={th}>Email</th><th className={th}>Phone</th><th className={th}>Orders</th><th className={th}>Spent</th><th className={th}>Joined</th></tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className={`${td} font-medium`}>{c.name}</td>
                  <td className={td}>{c.email}</td>
                  <td className={td}>{c.phone ?? "—"}</td>
                  <td className={td}>{c.orders}</td>
                  <td className={td}>{rs(c.spent)}</td>
                  <td className={`${td} text-muted`}>{date(c.joined)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

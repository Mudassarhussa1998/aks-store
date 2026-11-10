import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { AdminSidebar } from "@/components/admin/admin-nav";
import { TableSkeleton } from "@/components/admin/ui";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

// Every admin screen depends on the signed-in session, so it renders at request time.
export const instant = false;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-mist lg:flex">
      <AdminSidebar />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">
          <Suspense fallback={<TableSkeleton />}>
            <AdminGate>{children}</AdminGate>
          </Suspense>
        </div>
      </main>
    </div>
  );
}

async function AdminGate({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!user.is_admin) {
    return (
      <div className="max-w-md rounded-2xl border border-line bg-white p-8">
        <h1 className="text-xl font-semibold">Admins only</h1>
        <p className="mt-2 text-sm text-muted">
          You are signed in as {user.email}, which does not have admin access.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium underline">
          Back to the store
        </Link>
      </div>
    );
  }
  return children;
}

import { Suspense } from "react";

import { MessageList } from "@/components/admin/message-list";
import { adminApi } from "@/components/admin/server";
import type { ContactMessage } from "@/components/admin/types";
import { Card, FilterTabs, PageHeader, TableSkeleton } from "@/components/admin/ui";

export default function MessagesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  return (
    <>
      <PageHeader title="Messages" subtitle="From the Contact us page and career applications." />
      <Suspense fallback={<TableSkeleton />}>
        <Messages searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Messages({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const all = (await searchParams).view === "all";
  const messages = await adminApi<ContactMessage[]>("/messages", all ? undefined : { unread: "true" });
  return (
    <div className="flex flex-col gap-4">
      <FilterTabs
        tabs={[
          { href: "/admin/messages", label: "Unread", active: !all },
          { href: "/admin/messages?view=all", label: "All", active: all },
        ]}
      />
      <Card>
        <MessageList messages={messages} />
      </Card>
    </div>
  );
}

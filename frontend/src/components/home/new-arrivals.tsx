"use client";

import { useState, type ReactNode } from "react";

const TABS = [
  ["all", "All"],
  ["clothing", "Clothing"],
  ["home", "Home"],
] as const;

type Tab = (typeof TABS)[number][0];

/** Tabs switch between pre-rendered grids, so changing tab needs no network request. */
export function NewArrivalsTabs({ grids }: { grids: Record<Tab, ReactNode> }) {
  const [tab, setTab] = useState<Tab>("all");
  return (
    <>
      <div role="tablist" aria-label="Filter new arrivals" className="flex gap-1.5 rounded-full bg-mist p-1">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-10 cursor-pointer rounded-full px-5 text-sm font-medium transition-colors ${tab === id ? "bg-ink text-white" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div key={tab} role="tabpanel" className="order-last mt-2 w-full animate-fade">
        {grids[tab]}
      </div>
    </>
  );
}

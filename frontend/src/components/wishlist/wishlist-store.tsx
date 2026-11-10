"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";

import { setWishlisted, wishlistIds } from "@/app/actions/account";

type WishlistApi = { has: (id: number) => boolean; toggle: (id: number) => void; pending: boolean };

const WishlistContext = createContext<WishlistApi | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ids, setIds] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    wishlistIds().then((list) => setIds(new Set(list)));
  }, []);

  const toggle = useCallback(
    (id: number) => {
      const on = !ids.has(id);
      // Optimistic: flip the heart immediately, roll back if the server says no.
      setIds((prev) => {
        const next = new Set(prev);
        if (on) next.add(id);
        else next.delete(id);
        return next;
      });
      startTransition(async () => {
        const res = await setWishlisted(id, on);
        if (!res.ok) {
          setIds((prev) => {
            const next = new Set(prev);
            if (on) next.delete(id);
            else next.add(id);
            return next;
          });
          router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
        }
      });
    },
    [ids, router],
  );

  const value = useMemo(() => ({ has: (id: number) => ids.has(id), toggle, pending }), [ids, toggle, pending]);
  return <WishlistContext value={value}>{children}</WishlistContext>;
}

export function useWishlist() {
  const ctx = use(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}

"use client";

import { createContext, use, useCallback, useMemo, useSyncExternalStore, type ReactNode } from "react";

/** A cart line keeps a display snapshot so the cart renders instantly; prices are re-checked by the API. */
export type CartItem = {
  variantId: number;
  quantity: number;
  slug: string;
  name: string;
  label: string;
  price: number;
  image: string | null;
};

const KEY = "aks_cart_v1";
const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let snapshot: CartItem[] | null = null;

function read(): CartItem[] {
  if (snapshot) return snapshot;
  try {
    snapshot = JSON.parse(localStorage.getItem(KEY) ?? "[]") as CartItem[];
  } catch {
    snapshot = [];
  }
  return snapshot;
}

function write(items: CartItem[]) {
  snapshot = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // storage full or blocked: the cart still works for this tab
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

type CartApi = {
  /** false during server render / before hydration, so pages can avoid flashing "empty cart". */
  ready: boolean;
  items: CartItem[];
  count: number;
  add: (item: CartItem) => void;
  setQuantity: (variantId: number, quantity: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);

  const add = useCallback((item: CartItem) => {
    const current = read();
    const existing = current.find((i) => i.variantId === item.variantId);
    write(
      existing
        ? current.map((i) =>
            i.variantId === item.variantId ? { ...item, quantity: Math.min(20, i.quantity + item.quantity) } : i,
          )
        : [...current, item],
    );
  }, []);

  const setQuantity = useCallback((variantId: number, quantity: number) => {
    write(read().map((i) => (i.variantId === variantId ? { ...i, quantity: Math.max(1, Math.min(20, quantity)) } : i)));
  }, []);

  const remove = useCallback((variantId: number) => write(read().filter((i) => i.variantId !== variantId)), []);
  const clear = useCallback(() => write([]), []);

  const value = useMemo(
    () => ({ ready, items, count: items.reduce((n, i) => n + i.quantity, 0), add, setQuantity, remove, clear }),
    [ready, items, add, setQuantity, remove, clear],
  );
  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const ctx = use(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  id: string;
  size: string;
  artworkName: string;
  artworkSource: "curated" | "upload" | "unsplash";
  priceCents: number;
  customizationSessionId?: string;
  previewSnapshotPath?: string;
};

type CartContextValue = {
  cart: CartItem[];
  cartTotalCents: number;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

const storageKey = "mixtape-mosaic-cart";
const CartContext = createContext<CartContextValue | null>(null);

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as CartItem[];
        if (Array.isArray(parsed)) {
          setCart(parsed);
        }
      }
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(cart));
  }, [cart, loaded]);

  const value = useMemo<CartContextValue>(() => {
    return {
      cart,
      cartTotalCents: cart.reduce((sum, item) => sum + item.priceCents, 0),
      addItem: (item) => {
        setCart((current) => [
          ...current,
          {
            ...item,
            id: makeId()
          }
        ]);
      },
      removeItem: (id) => setCart((current) => current.filter((item) => item.id !== id)),
      clearCart: () => setCart([])
    };
  }, [cart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}

"use client";

import { useEffect } from "react";
import { useRef } from "react";
import { useCart } from "@/components/CartProvider";

export function CheckoutSuccessClient() {
  const { clearCart } = useCart();
  const cleared = useRef(false);

  useEffect(() => {
    if (cleared.current) {
      return;
    }
    cleared.current = true;
    clearCart();
  }, [clearCart]);

  return null;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu, ShoppingCart, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

const navItems = [
  { href: "/customize", label: "Shop", active: ["/", "/customize"], color: "text-secondary", hover: "hover:text-secondary" },
  { href: "/process", label: "Process", active: ["/process"], color: "text-primary", hover: "hover:text-primary" },
  { href: "/gallery", label: "Gallery", active: ["/gallery"], color: "text-accent", hover: "hover:text-accent" },
  { href: "/journal", label: "Journal", active: ["/journal"], color: "text-secondary", hover: "hover:text-secondary" }
];

const sampleCart = [
  {
    id: 1,
    size: 'Square (27"x27")',
    theme: "Custom Mosaic",
    price: 1395,
    text: "Preview proof before production"
  }
];

export function StorefrontHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cart, setCart] = useState(sampleCart);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price, 0), [cart]);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <nav className="sticky top-0 z-40 bg-background border-b-4 border-border px-6 py-4">
        <div className="mx-auto flex max-w-[1300px] justify-between items-center">
          <Link
            href="/"
            onClick={closeMenu}
            className="flex items-center gap-4 font-heading font-black text-2xl tracking-tight cursor-pointer"
          >
            <img
              src="/assets/mixtape-mosaic-logo-horizontal.svg"
              alt="Mixtape Mosaic"
              className="h-10 sm:h-12 w-auto"
            />
          </Link>

          <div className="hidden md:flex items-center gap-8 font-heading font-bold text-lg" aria-label="Primary navigation">
            {navItems.map((item) => {
              const isActive = item.active.some((activePath) => (activePath === "/" ? pathname === "/" : pathname.startsWith(activePath)));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${item.hover} transition-colors uppercase tracking-wider ${isActive ? item.color : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 bg-primary border-2 border-border px-6 py-2 shadow-[4px_4px_0_0_#292929] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#292929] transition-all uppercase tracking-wider"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Cart ({cart.length})</span>
            </button>
          </div>

          <div className="md:hidden flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative bg-primary border-2 border-border p-2 shadow-[2px_2px_0_0_#292929]"
              aria-label="Open cart"
            >
              <ShoppingCart className="w-6 h-6" />
              {cart.length > 0 ? (
                <span className="absolute -top-2 -right-2 bg-secondary text-background border-2 border-border w-6 h-6 flex items-center justify-center font-bold text-xs rounded-full">
                  {cart.length}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              className="border-2 border-border p-2 bg-foreground text-background shadow-[2px_2px_0_0_#FEB93C]"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      {isMenuOpen ? (
        <div className="md:hidden fixed inset-0 top-[76px] bg-background z-30 border-b-4 border-border flex flex-col items-center justify-center gap-8 font-heading font-black text-4xl uppercase tracking-tighter">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} onClick={closeMenu} className="hover:text-primary transition-colors">
              {item.label}
            </Link>
          ))}
          <Link href="/contact" onClick={closeMenu} className="hover:text-secondary transition-colors">
            Contact
          </Link>
        </div>
      ) : null}

      <AnimatePresence>
        {isCartOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-foreground z-50 cursor-pointer"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-card border-l-8 border-border z-50 flex flex-col shadow-[-12px_0_0_0_rgba(0,0,0,0.2)]"
            >
              <div className="flex justify-between items-center p-6 border-b-4 border-border bg-background">
                <h2 className="font-heading font-black text-3xl uppercase tracking-tighter">Your Cart</h2>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 border-2 border-border bg-primary hover:bg-secondary transition-colors shadow-[2px_2px_0_0_#292929]"
                  aria-label="Close cart"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                    <ShoppingCart className="w-16 h-16" />
                    <p className="font-mono font-bold uppercase tracking-wider">Your cart is empty.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className="bg-background border-4 border-border p-4 shadow-[4px_4px_0_0_#292929] flex justify-between items-start gap-4"
                    >
                      <div>
                        <h3 className="font-heading font-black text-xl uppercase tracking-tighter">{item.theme}</h3>
                        <p className="font-mono text-sm font-bold text-muted-foreground">{item.size}</p>
                        <p className="font-mono text-xs italic mt-2">"{item.text}"</p>
                        <p className="font-mono font-bold mt-2">${item.price}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCart(cart.filter((cartItem) => cartItem.id !== item.id))}
                        className="text-destructive hover:bg-destructive hover:text-background p-2 border-2 border-transparent hover:border-border transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 border-t-4 border-border bg-background space-y-4">
                <div className="flex justify-between font-heading font-black text-2xl uppercase">
                  <span>Total</span>
                  <span>${cartTotal}</span>
                </div>
                <Link
                  href="/checkout"
                  onClick={() => setIsCartOpen(false)}
                  className={`block text-center w-full bg-foreground text-background border-2 border-border py-4 font-heading font-black text-xl uppercase tracking-widest shadow-[6px_6px_0_0_#6B8F8B] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_#6B8F8B] transition-all ${
                    cart.length === 0 ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  Proceed to Checkout
                </Link>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

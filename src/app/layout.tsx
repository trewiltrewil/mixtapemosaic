import type { Metadata } from "next";
import { AdminLauncher } from "@/components/AdminLauncher";
import { CartProvider } from "@/components/CartProvider";
import { StorefrontHeader } from "@/components/StorefrontHeader";
import { VisitorTracker } from "@/components/VisitorTracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mixtape Mosaic",
  description: "Personalized vintage cassette wall art made from your chosen image."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <CartProvider>
          <VisitorTracker />
          <StorefrontHeader />
          {children}
          <AdminLauncher />
        </CartProvider>
      </body>
    </html>
  );
}

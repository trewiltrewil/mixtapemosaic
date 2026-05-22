import type { Metadata } from "next";
import { AdminLauncher } from "@/components/AdminLauncher";
import { StorefrontHeader } from "@/components/StorefrontHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mixtape Mosaic",
  description: "Personalized vintage cassette wall art made from your chosen image."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <StorefrontHeader />
        {children}
        <AdminLauncher />
      </body>
    </html>
  );
}

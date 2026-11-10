import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { CartProvider } from "@/components/cart/cart-store";
import { WishlistProvider } from "@/components/wishlist/wishlist-store";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Aks.pk — Clothing & Home Essentials", template: "%s · Aks.pk" },
  description:
    "Clothing for the family and soft essentials for the house — blankets, towels, pillows and more. Cash on Delivery across Pakistan.",
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen overflow-x-hidden">
        <CartProvider>
          <WishlistProvider>{children}</WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}

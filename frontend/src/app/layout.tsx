import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { CartProvider } from "@/components/cart/cart-store";
import { WishlistProvider } from "@/components/wishlist/wishlist-store";

import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Rawaj.pk — Clothing & Home Essentials in Pakistan", template: "%s · Rawaj.pk" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["online shopping Pakistan", "lawn suits", "kurta", "shalwar kameez", "blankets", "towels", "pillows", "bedsheets", "Cash on Delivery"],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_PK",
    url: "/",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Rawaj.pk — Comfort for every home" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
  icons: { icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png", sizes: "512x512" }], apple: "/apple-touch-icon.png" },
  formatDetection: { telephone: false },
  // Paste the code from Google Search Console → Settings → Ownership verification → HTML tag.
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-PK" className={inter.variable}>
      <body className="min-h-screen overflow-x-hidden">
        <CartProvider>
          <WishlistProvider>{children}</WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}

import type { MetadataRoute } from "next";

import { absolute } from "@/lib/site";

/** Keep private and per-person pages (account, cart, checkout, admin, sign-in flows) out of search results. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/cart", "/checkout", "/order/", "/auth/", "/login", "/register", "/verify", "/forgot-password", "/complete-profile", "/search"],
    },
    sitemap: absolute("/sitemap.xml"),
  };
}

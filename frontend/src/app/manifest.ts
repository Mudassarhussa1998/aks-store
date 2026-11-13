import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

/** Lets phones "Add to Home Screen" with the right name, colours and icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Clothing & Home Essentials`,
    short_name: "Velenzay",
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1e3a34",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}

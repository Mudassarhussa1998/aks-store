import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Product photos are pre-sized by the API at upload (320/640/1080 WebP), so we only pick a width.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
  async headers() {
    return [
      // Hero clips, posters and icons rarely change; let browsers keep them for a week.
      { source: "/hero/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
      { source: "/:file(og.jpg|icon.png|apple-touch-icon.png)", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
    ];
  },
  // Old help-page addresses moved to their own pages.
  async redirects() {
    return [
      { source: "/help/about", destination: "/about", permanent: true },
      { source: "/help/contact", destination: "/contact", permanent: true },
      { source: "/help/terms", destination: "/terms", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

"use client";

const WIDTHS = [320, 640, 1080];

/** Maps an API image base URL to the closest pre-generated width. Plain file URLs pass through. */
export default function imageLoader({ src, width }: { src: string; width: number }) {
  if (/\.(png|jpe?g|webp|avif|svg|gif)(\?.*)?$/i.test(src)) return src;
  const best = WIDTHS.find((w) => w >= width) ?? WIDTHS[WIDTHS.length - 1];
  return `${src}-${best}.webp`;
}

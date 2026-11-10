/** Public address and name of the store, used for canonical links, sitemaps and share previews. */
export const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "Rawaj.pk";
export const SITE_DESCRIPTION =
  "Clothing for the family and soft essentials for the home: lawn suits, kurtas, blankets, towels, pillows and more. Cash on Delivery across Pakistan.";

export const absolute = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`);

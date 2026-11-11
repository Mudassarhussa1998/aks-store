/**
 * Editorial content for the home page. Photos are pulled from the named products, so updating
 * a product's images in the admin panel updates the home page automatically.
 */
export const HERO = {
  eyebrow: "Winter Collection 2026",
  title: "Comfort for every home.",
  text: "Clothing for the family and soft essentials for the house. Pay in cash when it arrives.",
  cta: { label: "Shop now", href: "/shop" },
  link: { label: "New arrivals", href: "/shop?sort=newest" },
  points: ["Cash on Delivery", "Free delivery over Rs 3,000", "7-day easy returns"],
  /**
   * Background clips in public/hero: free-licence Pexels footage ("Various Clothing and Apparel at a Store", 8306450,
   * mirrored; "Clothes Hanging in a Rack", 7764682). Swap for your own brand film any time.
   */
  video: {
    wide: { video: "/hero/boutique-wide.mp4", poster: "/hero/boutique-wide.jpg" },
    tall: { video: "/hero/rack-tall.mp4", poster: "/hero/rack-tall.jpg" },
  },
  /** The first card is the large feature; the other two stack beside it. */
  cards: [
    { label: "Women", title: "New season lawn", text: "Embroidered 3-piece suits, ready to wear.", cta: "Shop women", href: "/c/women", product: "embroidered-lawn-3-piece" },
    { label: "Bedding", title: "Sleep softer", text: "Blankets, sheets and pillows.", cta: "Shop bedding", href: "/c/home-living", product: "hotel-pillow-pair" },
    { label: "Bath", title: "Towels that stay soft", text: "Thick cotton, wash after wash.", cta: "Shop bath", href: "/c/towels-bath", product: "spa-bath-essentials" },
  ],
} as const;

/** Category row under the hero, in display order. */
export const CATEGORY_ROW = ["women", "men", "kids", "shoes", "blankets", "pillows", "towels-bath", "curtains"] as const;

export const TILES = [
  { title: "Kurtas & shalwar kameez", text: "Pressed, breathable, ready to wear.", cta: "Shop men", href: "/c/men", product: "printed-linen-kurta" },
  { title: "Formals & festive wear", text: "Embroidery for every occasion.", cta: "Shop women", href: "/c/women", product: "festive-lehenga" },
] as const;

export const COMFORT = [
  { gsm: "300 GSM", name: "Standard", text: "Light and breathable. Right for Karachi and mild winter nights.", product: "classic-fleece-blanket", image: 2 },
  { gsm: "450 GSM", name: "Premium", text: "Double layer warmth for Lahore and Islamabad winters.", product: "sherpa-knit-throw", image: 0, highlight: true },
  { gsm: "600 GSM", name: "Luxury", text: "Sherpa lined and heavy. Built for the cold of the north.", product: "classic-fleece-blanket", image: 0 },
] as const;

export const REVIEW_PRODUCTS = ["classic-fleece-blanket", "embroidered-lawn-3-piece", "cotton-bath-towel"] as const;

export const CLOTHING_ROOTS = ["women", "men", "kids", "shoes"];

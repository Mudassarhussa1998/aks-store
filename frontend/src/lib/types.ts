// Mirrors backend/app/schemas.py. Prices are whole rupees.

export type User = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  is_admin: boolean;
  whatsapp_updates: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  /** False when the store runs without SMS: only the email is verified. */
  can_verify_phone: boolean;
  has_password: boolean;
  gender: "female" | "male" | "other" | null;
  date_of_birth: string | null;
  city: string | null;
  created_at: string;
};

export type Category = {
  id: number;
  slug: string;
  name: string;
  description: string;
  image_url: string | null;
  parent_id: number | null;
  children: Category[];
};

export type ProductCard = {
  id: number;
  slug: string;
  name: string;
  category: string;
  badge: string | null;
  price: number;
  compare_at_price: number | null;
  rating_avg: number;
  rating_count: number;
  image: string | null;
  colors: string[];
  in_stock: boolean;
};

export type Variant = {
  id: number;
  sku: string;
  size: string | null;
  color: string | null;
  color_hex: string | null;
  quality: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
};

export type ProductImage = { id: number; url: string; alt: string; color: string | null };

export type OptionKey = "size" | "color" | "quality";

export type ProductDetail = {
  id: number;
  slug: string;
  name: string;
  description: string;
  material_care: string;
  badge: string | null;
  category: Category;
  breadcrumbs: Category[];
  rating_avg: number;
  rating_count: number;
  rating_breakdown: Record<string, number>;
  images: ProductImage[];
  variants: Variant[];
  options: Record<OptionKey, string[]>;
};

export type Facets = {
  sizes: string[];
  colors: { name: string; hex: string }[];
  qualities: string[];
  price_min: number;
  price_max: number;
};

export type ProductPage = {
  items: ProductCard[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  facets: Facets | null;
};

export type Review = {
  id: number;
  rating: number;
  title: string;
  body: string;
  author: string;
  city: string | null;
  variant_label: string | null;
  verified: boolean;
  helpful_count: number;
  created_at: string;
  product_slug: string | null;
  product_name: string | null;
  is_published?: boolean | null;
};

export type ReviewPage = { items: Review[]; total: number; page: number; pages: number };

export type CartLine = { variant_id: number; quantity: number };

export type QuoteLine = {
  variant_id: number;
  product_id: number;
  product_slug: string;
  product_name: string;
  variant_label: string;
  sku: string;
  image: string | null;
  unit_price: number;
  compare_at_price: number | null;
  quantity: number;
  line_total: number;
  stock: number;
  available: boolean;
};

export type Quote = {
  lines: QuoteLine[];
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  coupon: string | null;
  coupon_error: string | null;
  free_delivery_threshold: number;
};

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" | "returned";

export type OrderItem = {
  variant_id: number | null;
  product_name: string;
  product_slug: string;
  variant_label: string;
  sku: string;
  image_url: string | null;
  unit_price: number;
  quantity: number;
};

export type Order = {
  number: string;
  status: OrderStatus;
  payment_method: string;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  coupon_code: string | null;
  name: string;
  phone: string;
  email: string | null;
  city: string;
  area: string;
  address: string;
  note: string;
  courier: string | null;
  tracking_number: string | null;
  created_at: string;
  items: OrderItem[];
  events: { status: OrderStatus; note: string; created_at: string }[];
};

export type OrderSummary = {
  number: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  item_count: number;
  city: string;
  name: string;
  phone: string;
};

export type Address = {
  id: number;
  label: string;
  name: string;
  phone: string;
  city: string;
  area: string;
  line: string;
  is_default: boolean;
};

/** Result shape returned by every Server Action. */
export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

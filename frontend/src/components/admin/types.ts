// Admin-only shapes (mirror backend/app/schemas.py). Shared shapes come from @/lib/types.
import type { ProductDetail } from "@/lib/types";

export type Stats = {
  orders_today: number;
  orders_yesterday: number;
  pending_orders: number;
  revenue_month: number;
  low_stock_variants: number;
  customers: number;
  pending_reviews: number;
  unread_messages: number;
};

export type ContactMessage = {
  id: number;
  topic: string;
  name: string;
  email: string;
  phone: string | null;
  order_number: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type AdminProduct = ProductDetail & { is_active: boolean; is_featured: boolean; category_id: number };

export type AdminCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  parent_id: number | null;
  sort_order: number;
  is_active: boolean;
  product_count: number;
  child_count: number;
};

export type CategoryInput = Omit<AdminCategory, "id" | "product_count" | "child_count">;

export type AdminProductRow = {
  id: number;
  slug: string;
  name: string;
  category: string;
  category_id: number;
  image: string | null;
  price: number;
  badge: string | null;
  is_active: boolean;
  is_featured: boolean;
  total_stock: number;
  variant_count: number;
  low_stock_variants: number;
  rating_avg: number;
  rating_count: number;
  created_at: string;
};

export type AdminProductList = {
  items: AdminProductRow[];
  total: number;
  page: number;
  pages: number;
  counts: { all: number; active: number; hidden: number; out_of_stock: number };
};

export type InventoryRow = {
  id: number;
  product_id: number;
  product_name: string;
  product_slug: string;
  product_active: boolean;
  image: string | null;
  sku: string;
  label: string;
  price: number;
  stock: number;
};

export type InventoryPage = { items: InventoryRow[]; total: number; page: number; pages: number; low_threshold: number };

export type Coupon = {
  id: number;
  code: string;
  kind: "percent" | "fixed";
  value: number;
  min_subtotal: number;
  is_active: boolean;
  expires_at: string | null;
};

export type CouponInput = Omit<Coupon, "id">;

export type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  orders: number;
  spent: number;
  joined: string;
};

export type VariantInput = {
  id?: number | null;
  sku: string;
  size: string | null;
  color: string | null;
  color_hex: string | null;
  quality: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
};

export type ImageInput = { url: string; alt: string; color: string | null };

export type ProductInput = {
  name: string;
  slug: string;
  category_id: number;
  description: string;
  material_care: string;
  badge: string | null;
  is_active: boolean;
  is_featured: boolean;
  variants: VariantInput[];
  images: ImageInput[];
};

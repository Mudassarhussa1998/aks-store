export const rs = (n: number) => `Rs ${n.toLocaleString("en-US")}`;

export const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const STATUS_LABEL: Record<string, string> = {
  pending: "Placed",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export const CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta",
  "Sialkot", "Gujranwala", "Hyderabad", "Abbottabad", "Bahawalpur", "Sargodha", "Sukkur",
];

/** "+923001234567" → "0300 1234567" (how numbers are written in Pakistan). */
export function phone(value: string | null | undefined) {
  if (!value) return "";
  const m = value.match(/^\+92(3\d{2})(\d{7})$/);
  return m ? `0${m[1]} ${m[2]}` : value;
}

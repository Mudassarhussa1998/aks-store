import { rs } from "@/lib/format";
import type { Quote } from "@/lib/types";

export function SummaryRows({ quote }: { quote: Quote | null }) {
  if (!quote) {
    return <div className="h-24 animate-pulse rounded bg-white/60" aria-label="Calculating totals" />;
  }
  const remaining = quote.free_delivery_threshold - quote.subtotal;
  return (
    <>
      <div className="flex justify-between text-[15px]">
        <span>Subtotal</span>
        <span>{rs(quote.subtotal)}</span>
      </div>
      {quote.discount > 0 && (
        <div className="flex justify-between text-[15px] text-ok">
          <span>Discount ({quote.coupon})</span>
          <span>− {rs(quote.discount)}</span>
        </div>
      )}
      <div className="flex justify-between text-[15px]">
        <span>Delivery</span>
        <span>{quote.delivery_fee ? rs(quote.delivery_fee) : "Free"}</span>
      </div>
      {quote.delivery_fee > 0 && remaining > 0 && (
        <span className="text-[13px] text-ok">Add {rs(remaining)} more for free delivery</span>
      )}
      <div className="flex justify-between border-t border-[#DDD6CA] pt-4 text-lg font-semibold">
        <span>Total</span>
        <span>{rs(quote.total)}</span>
      </div>
    </>
  );
}

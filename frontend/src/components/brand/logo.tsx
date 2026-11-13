import Link from "next/link";

/** The thread "V": one continuous stroke ending in a gold knot. Same drawing as public/brand/mark.svg. */
const V_PATH = "M24 31 L47 75 L70 31 q4.8 -7.7 11.5 -2.9";

/** Round brand mark. Inline SVG, so it needs no extra request and stays sharp. */
export function Mark({ size = 32, inverted = false, className = "" }: { size?: number; inverted?: boolean; className?: string }) {
  const ink = inverted ? "#F4F1EC" : "#1E3A34";
  const paper = inverted ? "#1E3A34" : "#F4F1EC";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={`shrink-0 ${className}`}>
      <circle cx="50" cy="50" r="50" fill={ink} />
      <path d={V_PATH} fill="none" stroke={paper} strokeWidth="6.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="82.6" cy="28.6" r="3.9" fill="#D2B482" />
    </svg>
  );
}

/** Mark + VELENZAY wordmark, linked home. Used in the header and phone menu. */
export function Logo({ href = "/", size = "md", onClick }: { href?: string; size?: "sm" | "md"; onClick?: () => void }) {
  const big = size === "md";
  return (
    <Link href={href} onClick={onClick} aria-label="Velenzay home" className="flex shrink-0 items-center gap-2">
      <Mark size={big ? 34 : 28} className={big ? "h-7 w-7 sm:h-[34px] sm:w-[34px]" : ""} />
      <span className={`font-semibold ${big ? "text-[18px] tracking-[0.12em] sm:text-[22px] sm:tracking-[0.14em]" : "text-lg tracking-[0.12em]"}`}>VELENZAY</span>
    </Link>
  );
}

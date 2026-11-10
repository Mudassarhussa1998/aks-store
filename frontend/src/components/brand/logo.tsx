import Link from "next/link";

/** The thread "R" from the Rawaj seal: one continuous stroke ending in a gold knot. */
const R_PATH = "M14 66V14H38a14 14 0 0 1 0 28H14M32 42L50 66q6 7 14-2";

/** Round brand mark (the centre of the seal). Inline SVG, so it needs no extra request and stays sharp. */
export function SealMark({ size = 32, inverted = false, className = "" }: { size?: number; inverted?: boolean; className?: string }) {
  const ink = inverted ? "#F4F1EC" : "#1E3A34";
  const paper = inverted ? "#1E3A34" : "#F4F1EC";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={`shrink-0 ${className}`}>
      <circle cx="50" cy="50" r="50" fill={ink} />
      <path d={R_PATH} transform="translate(25.8 24.3) scale(.62)" fill="none" stroke={paper} strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="65.5" cy="64" r="3" fill="#D2B482" />
    </svg>
  );
}

/** The full seal with "RAWAJ · CLOTHING · HOME · PAKISTAN" around it. */
export function Seal({ size = 120, inverted = false, className = "" }: { size?: number; inverted?: boolean; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static vector, no resizing needed
    <img src={inverted ? "/brand/seal-light.svg" : "/brand/seal.svg"} width={size} height={size} alt="Rawaj — clothing and home, Pakistan" className={className} />
  );
}

/** Mark + wordmark, linked home. Used in the header, phone menu and admin. */
export function Logo({ href = "/", size = "md", onClick }: { href?: string; size?: "sm" | "md"; onClick?: () => void }) {
  const big = size === "md";
  return (
    <Link href={href} onClick={onClick} aria-label="Rawaj.pk home" className="flex shrink-0 items-center gap-2">
      <SealMark size={big ? 34 : 28} className={big ? "h-7 w-7 sm:h-[34px] sm:w-[34px]" : ""} />
      <span className={`font-semibold ${big ? "text-[20px] tracking-[0.06em] sm:text-[24px] sm:tracking-[0.08em]" : "text-lg tracking-[0.06em]"}`}>
        RAWAJ<span className={`tracking-normal text-muted ${big ? "text-xs sm:text-sm" : "text-[11px]"}`}>.pk</span>
      </span>
    </Link>
  );
}

/** The shopper's Google photo when they have one, otherwise their initials. */
export function Avatar({ name, src, size = 44, className = "" }: { name: string; src?: string | null; size?: number; className?: string }) {
  const box = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`;
  if (src) {
    return (
      // A plain <img>: Google serves these already sized, and the custom next/image loader is for our own photos.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" width={size} height={size} referrerPolicy="no-referrer" className={`${box} object-cover`} style={{ width: size, height: size }} />
    );
  }
  return (
    <span aria-hidden className={`${box} bg-forest font-semibold text-white`} style={{ width: size, height: size, fontSize: size * 0.34 }}>
      {initials(name)}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

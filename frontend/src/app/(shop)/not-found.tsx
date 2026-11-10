import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="tracking-tight text-5xl font-semibold">
        Page not found
      </h1>
      <p className="text-body">This page may have moved, or the product is no longer available.</p>
      <div className="flex gap-3">
        <Link href="/" className="rounded bg-forest px-6 py-3 font-medium text-white hover:text-white">
          Go home
        </Link>
        <Link href="/shop" className="rounded border border-ink px-6 py-3 font-medium">
          Browse products
        </Link>
      </div>
    </div>
  );
}

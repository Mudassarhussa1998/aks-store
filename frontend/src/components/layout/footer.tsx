import Link from "next/link";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      ["Women", "/c/women"],
      ["Men", "/c/men"],
      ["Kids", "/c/kids"],
      ["Home & Living", "/c/home-living"],
    ],
  },
  {
    title: "Help",
    links: [
      ["Track my order", "/track"],
      ["Returns & exchanges", "/help/returns"],
      ["Delivery information", "/help/delivery"],
      ["Contact us", "/help/contact"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About Aks", "/help/about"],
      ["Privacy policy", "/help/privacy"],
      ["Terms", "/help/terms"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 bg-sand">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 pt-12 pb-6 text-sm md:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-2.5 md:col-span-1">
          <span className="text-2xl font-semibold tracking-[0.08em]">
            AKS<span className="text-[13px] tracking-normal text-muted">.pk</span>
          </span>
          <p className="leading-relaxed text-body">Clothing and home essentials, delivered across Pakistan.</p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title} className="flex flex-col gap-2.5">
            <span className="font-semibold">{col.title}</span>
            {col.links.map(([label, href]) => (
              <Link key={href} href={href} className="hover:text-forest">
                {label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-7xl border-t border-[#DDD6CA] px-4 py-4 text-[13px] text-muted">
        © 2026 Aks.pk · All rights reserved
      </div>
    </footer>
  );
}

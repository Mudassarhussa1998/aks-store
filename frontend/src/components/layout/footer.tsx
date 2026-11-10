import Link from "next/link";

import { SOCIAL } from "@/content/company";

import { Seal } from "../brand/logo";
const COLUMNS = [
  {
    title: "Shop",
    links: [
      ["Women", "/c/women"],
      ["Men", "/c/men"],
      ["Kids", "/c/kids"],
      ["Shoes", "/c/shoes"],
      ["Blankets", "/c/blankets"],
      ["Bedsheets", "/c/bedsheets"],
      ["Towels & Bath", "/c/towels-bath"],
      ["All products", "/shop"],
    ],
  },
  {
    title: "Help",
    links: [
      ["Track my order", "/track"],
      ["Returns & exchanges", "/help/returns"],
      ["Delivery information", "/help/delivery"],
      ["FAQ", "/faq"],
      ["Contact us", "/contact"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About us", "/about"],
      ["Careers", "/careers"],
      ["Privacy policy", "/help/privacy"],
      ["Delete your data", "/help/delete-your-data"],
      ["Terms & Conditions", "/terms"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-sand">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 pt-12 pb-6 text-sm md:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-2.5 md:col-span-1">
          <Seal size={104} />
          <span className="text-xl font-semibold tracking-[0.08em]">
            RAWAJ<span className="text-[13px] tracking-normal text-muted">.pk</span>
          </span>
          <p className="leading-relaxed text-body">Clothing and home essentials, delivered across Pakistan.</p>
          {SOCIAL.some((x) => x.url) && (
            <p className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
              {SOCIAL.filter((x) => x.url).map((x) => (
                <a key={x.name} href={x.url} target="_blank" rel="noopener me" className="font-medium hover:text-forest">
                  {x.name}
                </a>
              ))}
            </p>
          )}
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
        © 2026 Rawaj.pk · All rights reserved
      </div>
    </footer>
  );
}

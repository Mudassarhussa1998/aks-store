import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 22): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
});

export const SearchIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
);
export const HeartIcon = ({ size, filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base(size)} fill={filled ? "currentColor" : "none"} {...p}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </svg>
);
export const UserIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
);
export const BagIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
);
export const ArrowRight = ({ size = 16, ...p }: P) => (
  <svg {...base(size)} strokeWidth={2} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const ArrowUpRight = ({ size = 16, ...p }: P) => (
  <svg {...base(size)} strokeWidth={2} {...p}><path d="M7 17L17 7M9 7h8v8" /></svg>
);
export const ChevronLeft = ({ size = 16, ...p }: P) => (
  <svg {...base(size)} strokeWidth={2} {...p}><path d="M15 5l-7 7 7 7" /></svg>
);
export const ChevronRight = ({ size = 16, ...p }: P) => (
  <svg {...base(size)} strokeWidth={2} {...p}><path d="M9 5l7 7-7 7" /></svg>
);
export const MenuIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const CloseIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const CheckIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={2} {...p}><path d="M5 12l5 5L20 7" /></svg>
);
export const CashIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M3 7h18v10H3zM7 12h.01M17 12h.01M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /></svg>
);
export const TruckIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
  </svg>
);
export const ReturnIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" /></svg>
);
export const ChatIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12z" /></svg>
);
export const ChevronDown = ({ size = 16, ...p }: P) => (
  <svg {...base(size)} strokeWidth={2} {...p}><path d="M5 9l7 7 7-7" /></svg>
);
export const PackageIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8" /></svg>
);
export const StarIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z" /></svg>
);
export const PinIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
export const ClockIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const LogoutIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" /></svg>
);
export const SlidersIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>
);
export const GridIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
);
export const TagIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M3 12V4h8l10 10-8 8L3 12z" /><circle cx="7.5" cy="8.5" r="1.5" /></svg>
);
export const LayersIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5" /></svg>
);
export const UsersIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2.2.6 3.5 2.4 3.5 5.2" /></svg>
);
export const TicketIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V4H3v4zM14 4v16" strokeDasharray="0" /></svg>
);
export const StoreIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 10v10h16V10M3 4h18l-1 6H4L3 4zM9 20v-6h6v6" /></svg>
);
export const CopyIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></svg>
);
export const EyeIcon = ({ size, off, ...p }: P & { off?: boolean }) => (
  <svg {...base(size)} {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);
export const TrashIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);
export const ArrowUpIcon = ({ size = 16, ...p }: P) => (
  <svg {...base(size)} strokeWidth={2} {...p}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
);
export const ArrowDownIcon = ({ size = 16, ...p }: P) => (
  <svg {...base(size)} strokeWidth={2} {...p}><path d="M12 5v14M6 13l6 6 6-6" /></svg>
);

export function Stars({ value, className = "" }: { value: number; className?: string }) {
  const full = Math.round(value);
  return (
    <span className={`tracking-[2px] text-star ${className}`} aria-label={`${value} out of 5 stars`}>
      {"★".repeat(full)}
      <span className="text-line-strong">{"★".repeat(5 - full)}</span>
    </span>
  );
}

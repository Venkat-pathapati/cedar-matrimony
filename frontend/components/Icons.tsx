import type { ReactNode } from "react";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const wrap = (d: ReactNode, size = 24) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...S}>{d}</svg>
);

export const Cross = ({ size }: { size?: number }) => wrap(<><path d="M12 3v18" /><path d="M6 9h12" /></>, size);
export const HeartIcon = ({ size, filled }: { size?: number; filled?: boolean }) =>
  <svg width={size ?? 24} height={size ?? 24} viewBox="0 0 24 24" aria-hidden="true" {...S} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20s-7-4.4-9-9.2C1.8 7.6 3.6 4.5 6.8 4.5c2 0 3.5 1.1 5.2 3 1.7-1.9 3.2-3 5.2-3 3.2 0 5 3.1 3.8 6.3C19 15.6 12 20 12 20z" />
  </svg>;
export const Shield = ({ size }: { size?: number }) => wrap(<><path d="M12 3l7 3v5c0 4.6-3 8.2-7 10-4-1.8-7-5.4-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></>, size);
export const Lock = ({ size }: { size?: number }) => wrap(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>, size);
export const Family = ({ size }: { size?: number }) => wrap(<><circle cx="8" cy="7" r="2.5" /><circle cx="16.5" cy="8.5" r="2" /><path d="M3 19v-2a4 4 0 014-4h2a4 4 0 014 4v2" /><path d="M15 14h2a4 4 0 014 4v1" /></>, size);
export const User = ({ size }: { size?: number }) => wrap(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></>, size);
export const Sliders = ({ size }: { size?: number }) => wrap(<><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>, size);
export const Search = ({ size }: { size?: number }) => wrap(<><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></>, size);
export const Chat = ({ size }: { size?: number }) => wrap(<><path d="M4 5h16v11H9l-5 4V5z" /><path d="M8 9.5h8M8 12.5h5" /></>, size);
export const Arrow = ({ size }: { size?: number }) => wrap(<path d="M5 12h14M13 6l6 6-6 6" />, size ?? 16);
export const Pin = ({ size }: { size?: number }) => wrap(<><path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>, size ?? 14);
export const Check = ({ size }: { size?: number }) => wrap(<path d="M5 12.5l4.5 4.5L19 7.5" />, size ?? 14);
export const Ban = ({ size }: { size?: number }) => wrap(<><circle cx="12" cy="12" r="8.5" /><path d="M6 18L18 6" /></>, size);
export const Eye = ({ size }: { size?: number }) => wrap(<><path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="2.8" /></>, size);
export const Globe = ({ size }: { size?: number }) => wrap(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" /></>, size ?? 16);
export const Chevron = ({ dir = "down", size }: { dir?: "down" | "left" | "right"; size?: number }) =>
  wrap(<path d={dir === "down" ? "M6 9l6 6 6-6" : dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />, size ?? 16);
export const Facebook = () => wrap(<path d="M14 8h3V4h-3a4 4 0 00-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8.5c0-.3.2-.5.5-.5z" />, 20);
export const Instagram = () => wrap(<><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" /><circle cx="16.8" cy="7.2" r=".6" /></>, 20);
export const Youtube = () => wrap(<><rect x="3" y="6" width="18" height="12" rx="3.5" /><path d="M10.5 9.5l4 2.5-4 2.5z" /></>, 20);
export const Whatsapp = () => wrap(<><path d="M4 20l1.2-4A8 8 0 1112 20a8 8 0 01-4-1.1L4 20z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.2-1.8-.9-.8.6a4 4 0 01-1.8-1.8l.6-.8-.9-1.8L9 9.5z" /></>, 20);
export const Cap = ({ size }: { size?: number }) => wrap(<><path d="M2 9l10-5 10 5-10 5L2 9z" /><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5" /></>, size ?? 14);
export const Briefcase = ({ size }: { size?: number }) => wrap(<><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 12h18" /></>, size ?? 14);
export const Filter = ({ size }: { size?: number }) => wrap(<path d="M4 5h16l-6 8v6l-4-2v-4L4 5z" />, size ?? 18);
export const Grid = ({ size }: { size?: number }) => wrap(<><rect x="4" y="4" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" /></>, size ?? 18);
export const ListIcon = ({ size }: { size?: number }) => wrap(<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />, size ?? 18);
export const Star = ({ size }: { size?: number }) => wrap(<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8L12 3.5z" />, size ?? 22);
export const FaithLeaf = ({ size }: { size?: number }) => (
  <img src="/images/faith-leaf.png" alt="" width={Math.round((size ?? 32) * 1.35)} height={Math.round((size ?? 32) * 1.35)} style={{ objectFit: "contain" }} />
);
export const Crown = ({ size }: { size?: number }) => wrap(<><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5L3 8z" /><path d="M5 21h14" /></>, size ?? 28);
export const Gem = ({ size }: { size?: number }) => wrap(<><path d="M6 4h12l4 5-10 11L2 9l4-5z" /><path d="M2 9h20M9 4l3 5 3-5M12 20L9 9M12 20l3-11" /></>, size ?? 28);
export const XMark = ({ size }: { size?: number }) => wrap(<path d="M7 7l10 10M17 7L7 17" />, size ?? 12);
export const Hearts = ({ size }: { size?: number }) => wrap(<><path d="M9.5 19C5 15.8 2.8 13.2 2.8 10 2.8 7.8 4.4 6.2 6.5 6.2c1.3 0 2.5.7 3 1.8.5-1.1 1.7-1.8 3-1.8 2.1 0 3.7 1.6 3.7 3.8 0 3.2-2.2 5.8-6.7 9z" /><path d="M14.5 17.2c4-2.9 6.7-5.4 6.7-8.4 0-2-1.5-3.5-3.4-3.5-.9 0-1.7.3-2.3.9" /></>, size ?? 34);
export const FamilyThree = ({ size }: { size?: number }) => wrap(<><circle cx="12" cy="5.5" r="2.3" /><circle cx="5" cy="9" r="1.9" /><circle cx="19" cy="9" r="1.9" /><path d="M8.3 20v-4.2a3.7 3.7 0 017.4 0V20" /><path d="M1.8 19v-3.3a3.2 3.2 0 013.2-3.2M22.2 19v-3.3a3.2 3.2 0 00-3.2-3.2" /></>, size ?? 34);
export const Mail = ({ size }: { size?: number }) => wrap(<><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7l8.5 6 8.5-6" /></>, size ?? 20);
export const Phone = ({ size }: { size?: number }) => wrap(<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A15 15 0 013 6a2 2 0 012-2z" />, size ?? 20);
export const Headset = ({ size }: { size?: number }) => wrap(<><path d="M4 14v-2a8 8 0 0116 0v2" /><rect x="3" y="14" width="4" height="6" rx="1.5" /><rect x="17" y="14" width="4" height="6" rx="1.5" /><path d="M19 20c0 1.2-1.5 2-4 2h-2" /></>, size ?? 24);
export const Send = ({ size }: { size?: number }) => wrap(<path d="M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z" />, size ?? 22);
export const Doc = ({ size }: { size?: number }) => wrap(<><path d="M6 3h8l4 4v14H6V3z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>, size ?? 20);
export const Clock = ({ size }: { size?: number }) => wrap(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, size ?? 22);
export const PinSolid = ({ size }: { size?: number }) => wrap(<><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.6" /></>, size ?? 24);
export const UserCircle = ({ size }: { size?: number }) => wrap(<><circle cx="12" cy="8.5" r="3.6" /><path d="M4.5 20.5c.8-4 3.8-6 7.5-6s6.7 2 7.5 6" /></>, size ?? 24);
export const LogOut = ({ size }: { size?: number }) => wrap(<><path d="M9 4H6a2 2 0 00-2 2v12a2 2 0 002 2h3" /><path d="M16 8l4 4-4 4M20 12H9" /></>, size ?? 20);
export const Calendar = ({ size }: { size?: number }) => wrap(<><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>, size ?? 22);
export const Ruler = ({ size }: { size?: number }) => wrap(<><rect x="3" y="8" width="18" height="8" rx="1.5" /><path d="M7 8v3M11 8v4M15 8v3M19 8v4" /></>, size ?? 22);
export const Msg = ({ size }: { size?: number }) => wrap(<path d="M4 5h16v11H9l-5 4V5z" />, size ?? 22);
export const Camera = ({ size }: { size?: number }) => wrap(<><path d="M4 8h3l1.5-2h7L17 8h3v11H4V8z" /><circle cx="12" cy="13" r="3.4" /></>, size ?? 20);
export const HomeIcon = ({ size }: { size?: number }) => wrap(<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4v-9z" />, size ?? 20);
export const Dots = ({ size }: { size?: number }) => wrap(<path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth="3" />, size ?? 20);
export const Flag = ({ size }: { size?: number }) => wrap(<path d="M5 21V4M5 4h11l-2 4 2 4H5" />, size ?? 18);
export const Pencil = ({ size }: { size?: number }) => wrap(<><path d="M4 20l1-4L16.5 4.5a2 2 0 013 3L8 19l-4 1z" /><path d="M14.5 6.5l3 3" /></>, size ?? 20);
export const Bell = ({ size }: { size?: number }) => wrap(<><path d="M6 17V11a6 6 0 0112 0v6l1.5 2h-15L6 17z" /><path d="M10 21a2 2 0 004 0" /></>, size ?? 22);

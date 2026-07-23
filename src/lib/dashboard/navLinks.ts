import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  HardDrive,
  LayoutGrid,
  Megaphone,
  Mic,
  Music2,
  Radio,
  Settings,
} from "lucide-react";
import type { BrandId } from "@/components/brand/BrandLogo";

export type DashboardNavLink = {
  href: string;
  label: string;
  icon?: LucideIcon;
  brand?: BrandId;
  opensInNewTab?: boolean;
};

export const DASHBOARD_NAV_LINKS: DashboardNavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/grilla", label: "Grilla", icon: CalendarDays },
  { href: "/cabina", label: "Aire", icon: Radio, opensInNewTab: true },
  { href: "/spotify", label: "Spotify", brand: "spotify" },
  { href: "/locutores", label: "Locutores IA", icon: Mic },
  { href: "/publicidad", label: "Publicidad", icon: Megaphone },
  { href: "/audios", label: "Audios", icon: Music2 },
  { href: "/almacenamiento", label: "Almacenamiento", icon: HardDrive },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export function resolveNavHref(link: DashboardNavLink, aireToken: string | null): string {
  if (link.href === "/cabina") {
    if (!aireToken) return "/configuracion";
    return `/cabina?token=${encodeURIComponent(aireToken)}`;
  }
  return link.href;
}

export function isNavLinkActive(pathname: string, href: string): boolean {
  const base = href.split("?")[0] ?? href;
  if (base === "/cabina") return false;
  return pathname === base || pathname.startsWith(`${base}/`);
}

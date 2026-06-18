"use client";

import {
  CalendarDays,
  LayoutDashboard,
  Megaphone,
  Menu,
  Radio,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type BottomNavTab = "dashboard" | "grilla" | "cabina" | "publicidad" | "mas";

export type BottomNavProps = {
  cabinaHref?: string;
  onMasClick?: () => void;
  className?: string;
};

type NavItem = {
  id: BottomNavTab;
  label: string;
  href?: string;
  icon: LucideIcon;
  center?: boolean;
};

const items: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "grilla", label: "Grilla", href: "/grilla", icon: CalendarDays },
  { id: "cabina", label: "Cabina", icon: Radio, center: true },
  { id: "publicidad", label: "Publicidad", href: "/publicidad", icon: Megaphone },
  { id: "mas", label: "Más", icon: Menu },
];

function isActive(pathname: string, href?: string): boolean {
  if (!href) {
    return false;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav({ cabinaHref = "/configuracion", onMasClick, className }: BottomNavProps): React.ReactElement {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--border)] bg-[color:var(--background)]/85 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden",
        className,
      )}
      aria-label="Navegación principal"
    >
      <ul className="grid grid-cols-5 items-end gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const href = item.id === "cabina" ? cabinaHref : item.href;
          const active = item.id === "cabina" ? pathname.startsWith("/cabina") : isActive(pathname, href);

          const content = (
            <>
              <span
                className={cn(
                  "flex items-center justify-center transition-colors",
                  item.center
                    ? "h-12 w-12 -translate-y-2 rounded-full bg-[color:var(--primary)] text-[color:var(--primary-foreground)] shadow-[0_0_20px_var(--primary-glow)]"
                    : "h-6 w-6",
                  !item.center && active ? "text-[color:var(--primary)]" : !item.center ? "text-[color:var(--muted)]" : undefined,
                )}
              >
                <Icon className={item.center ? "h-5 w-5" : "h-5 w-5"} aria-hidden />
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  active ? "text-[color:var(--primary)]" : "text-[color:var(--muted)]",
                  item.center ? "sr-only" : undefined,
                )}
              >
                {item.label}
              </span>
            </>
          );

          return (
            <li key={item.id} className="flex justify-center">
              {item.id === "mas" ? (
                <button
                  type="button"
                  className="flex flex-col items-center gap-1 px-2 py-1"
                  onClick={onMasClick}
                >
                  {content}
                </button>
              ) : href ? (
                <Link href={href} className="flex flex-col items-center gap-1 px-2 py-1">
                  {content}
                </Link>
              ) : (
                <span className="flex flex-col items-center gap-1 px-2 py-1">{content}</span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

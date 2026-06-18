"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ChevronDown, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AironMark } from "@/components/brand/AironMark";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  DASHBOARD_NAV_LINKS,
  isNavLinkActive,
  resolveNavHref,
} from "@/lib/dashboard/navLinks";
import { cn } from "@/lib/utils";

export type DesktopNavbarProps = {
  radioNombre: string;
  userNombre: string;
  aireToken?: string | null;
  className?: string;
};

function NavDivider(): React.ReactElement {
  return (
    <div
      aria-hidden
      className="mx-3 h-7 w-px shrink-0 bg-[color:var(--border)]/80"
    />
  );
}

export function DesktopNavbar({
  radioNombre,
  userNombre,
  aireToken = null,
  className,
}: DesktopNavbarProps): React.ReactElement {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointer = (event: MouseEvent): void => {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  return (
    <header className={cn("sticky top-0 z-40 hidden px-5 pt-5 md:block", className)}>
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex h-[54px] max-w-[1440px] items-center rounded-[22px] border border-[#1a1a1a] bg-[#0d0d0d] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
      >
        <div className="flex shrink-0 items-center gap-2.5 pl-1">
          <Link className="flex items-center gap-2.5" href="/dashboard">
            <AironMark />
            <span className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white">
              AIRON
            </span>
          </Link>
        </div>

        <NavDivider />

        <div className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {DASHBOARD_NAV_LINKS.map((link) => {
            const href = resolveNavHref(link, aireToken);
            const active = isNavLinkActive(pathname, link.href);
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-[11px] px-3 py-1.5 text-[12px] font-medium transition-colors",
                  active
                    ? "border border-[color:var(--primary)] text-white"
                    : "border border-transparent text-[#e8e8e8] hover:text-white",
                )}
                href={href}
                rel={link.opensInNewTab ? "noopener noreferrer" : undefined}
                target={link.opensInNewTab ? "_blank" : undefined}
              >
                {link.brand ? (
                  <BrandLogo
                    brand={link.brand}
                    className={cn(!active && "opacity-60")}
                    size="xs"
                  />
                ) : Icon ? (
                  <Icon
                    aria-hidden
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      active ? "text-[color:var(--primary)]" : "text-[#7a7a7a]",
                    )}
                  />
                ) : null}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        <NavDivider />

        <div className="relative flex shrink-0 items-center gap-2.5 pr-1" ref={profileRef}>
          <button
            type="button"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            aria-label="Menú de perfil"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--primary)] text-[color:var(--primary)] transition hover:bg-[color:var(--primary)]/10"
            onClick={() => setProfileOpen((prev) => !prev)}
          >
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </button>

          <button
            type="button"
            className="min-w-0 text-left"
            onClick={() => setProfileOpen((prev) => !prev)}
          >
            <p className="truncate text-[13px] font-medium leading-tight text-white">
              {radioNombre}
            </p>
            <p className="truncate text-[11px] leading-tight text-[#7a7a7a]">Ver perfil</p>
          </button>

          {profileOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[12rem] overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#141414] py-1 shadow-[var(--shadow-dropdown)]"
            >
              <div className="border-b border-[#2a2a2a] px-4 py-2.5">
                <p className="text-sm font-medium text-white">{radioNombre}</p>
                <p className="mt-0.5 truncate text-xs text-[#7a7a7a]">{userNombre}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#d4d4d4] transition hover:bg-[#1f1f1f]"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                Cerrar sesión
              </button>
            </div>
          ) : null}
        </div>
      </nav>
    </header>
  );
}

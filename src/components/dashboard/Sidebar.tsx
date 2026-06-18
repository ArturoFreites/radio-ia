"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ChevronDown, LogOut } from "lucide-react";
import { useState } from "react";
import { AironLogo } from "@/components/brand/AironLogo";
import { BrandLogo, type BrandId } from "@/components/brand/BrandLogo";
import {
  DASHBOARD_NAV_LINKS,
  isNavLinkActive,
  resolveNavHref,
} from "@/lib/dashboard/navLinks";
import { cn } from "@/lib/utils";

export type SidebarProps = {
  radioNombre: string;
  userNombre: string;
  aireToken?: string | null;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

function LinkItem({
  href,
  label,
  icon,
  brand,
  active,
  opensInNewTab,
  onNavigate,
}: {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  brand?: BrandId;
  active: boolean;
  opensInNewTab?: boolean;
  onNavigate?: () => void;
}): React.ReactElement {
  const Icon = icon;

  return (
    <Link
      className={cn(
        "group flex items-center gap-3 rounded-[16px] px-3 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-[color:var(--primary-glow)] text-[color:var(--primary)] shadow-[inset_0_0_0_1px_rgba(194,252,74,0.18)]"
          : "text-[color:var(--muted)] hover:bg-[color:var(--surface-soft)] hover:text-white",
      )}
      href={href}
      onClick={onNavigate}
      rel={opensInNewTab ? "noopener noreferrer" : undefined}
      target={opensInNewTab ? "_blank" : undefined}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl transition-colors",
          active
            ? "bg-[color:var(--primary)] text-[color:var(--primary-foreground)] shadow-[0_0_20px_rgba(194,252,74,0.35)]"
            : "bg-[color:var(--surface-soft)] text-[color:var(--muted)] group-hover:text-white",
        )}
      >
        {brand ? <BrandLogo brand={brand} size="sm" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      </span>
      <span>{label}</span>
    </Link>
  );
}

export function Sidebar({
  radioNombre,
  userNombre,
  aireToken = null,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps): React.ReactElement {
  const pathname = usePathname();
  const closeOnNavigate = onMobileClose;
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col border-r border-[color:var(--border)] bg-[color:var(--background)] px-4 py-5 transition-transform duration-200 ease-out",
        "max-md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      )}
    >
      <div className="mb-8 px-1">
        <AironLogo className="mb-1" priority size="sm" />
        <p className="text-[11px] text-[color:var(--muted)]">Radio con inteligencia artificial</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {DASHBOARD_NAV_LINKS.map((link) => (
          <LinkItem
            key={link.href}
            active={isNavLinkActive(pathname, link.href)}
            brand={link.brand}
            href={resolveNavHref(link, aireToken)}
            icon={link.icon}
            label={link.label}
            opensInNewTab={link.opensInNewTab}
            onNavigate={closeOnNavigate}
          />
        ))}
      </nav>

      <div className="mt-6 space-y-3 border-t border-[color:var(--border)] pt-5">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
          <p className="text-sm font-semibold text-white">{radioNombre}</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--success)] animate-airon-pulse-dot"
              aria-hidden
            />
            <p className="text-xs text-[color:var(--muted)]">En línea</p>
          </div>
          <button
            type="button"
            className="mt-3 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[color:var(--muted)] transition hover:border-[color:var(--primary)]/25 hover:text-white"
            onClick={() => setProfileOpen((prev) => !prev)}
          >
            Ver perfil
          </button>
        </div>

        <button
          type="button"
          aria-expanded={profileOpen}
          className="flex w-full items-center justify-between rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-left transition hover:bg-[color:var(--surface-soft)]"
          onClick={() => setProfileOpen((prev) => !prev)}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{userNombre}</p>
            <p className="truncate text-xs text-[color:var(--muted)]">Ver perfil</p>
          </div>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-[color:var(--muted)] transition", profileOpen && "rotate-180")}
            aria-hidden
          />
        </button>

        {profileOpen ? (
          <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]">
            <Link
              className="block px-4 py-2.5 text-sm text-[color:var(--muted)] transition hover:bg-[color:var(--surface-soft)] hover:text-white"
              href="/configuracion"
              onClick={closeOnNavigate}
            >
              Configuración
            </Link>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[color:var(--danger)] transition hover:bg-[color:var(--surface-soft)]"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              Cerrar sesión
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

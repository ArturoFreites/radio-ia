"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AironLogo } from "@/components/brand/AironLogo";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  CalendarDays,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Mic2,
  Music2,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type MobileSidebarItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export type MobileSidebarProps = {
  open: boolean;
  onClose: () => void;
  radioNombre: string;
  usuarioNombre: string;
  usuarioEmail?: string;
  onLogout?: () => void;
  className?: string;
};

const defaultItems: MobileSidebarItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: "/grilla", label: "Grilla", icon: <CalendarDays className="h-5 w-5" /> },
  { href: "/spotify", label: "Spotify", icon: <BrandLogo brand="spotify" size="md" /> },
  { href: "/locutores", label: "Locutores", icon: <Mic2 className="h-5 w-5" /> },
  { href: "/publicidad", label: "Publicidad", icon: <Megaphone className="h-5 w-5" /> },
  { href: "/audios", label: "Audios", icon: <Music2 className="h-5 w-5" /> },
  { href: "/almacenamiento", label: "Almacenamiento", icon: <HardDrive className="h-5 w-5" /> },
  { href: "/configuracion", label: "Configuración", icon: <Settings className="h-5 w-5" /> },
];

export function MobileSidebar({
  open,
  onClose,
  radioNombre,
  usuarioNombre,
  usuarioEmail,
  onLogout,
  className,
}: MobileSidebarProps): React.ReactElement {
  const pathname = usePathname();

  return (
    <AnimatePresence>
      {open ? (
        <div className={cn("fixed inset-0 z-40 md:hidden", className)}>
          <motion.button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative flex h-full w-[min(88vw,320px)] flex-col border-r border-[color:var(--border)] bg-[color:var(--surface-soft)] shadow-[var(--shadow-dropdown)]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
              <div className="min-w-0">
                <AironLogo className="mb-3" size="sm" />
                <p className="truncate text-base font-semibold text-[color:var(--text)]">{radioNombre}</p>
                <p className="truncate text-sm text-[color:var(--muted)]">{usuarioNombre}</p>
                {usuarioEmail ? (
                  <p className="truncate text-xs text-[color:var(--muted)]">{usuarioEmail}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                className="rounded-xl p-2 text-[color:var(--muted)] hover:bg-[color:var(--surface)] hover:text-[color:var(--text)]"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3">
              <ul className="space-y-1">
                {defaultItems.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                          active
                            ? "bg-[color:var(--primary)] text-[color:var(--primary-foreground)]"
                            : "text-[color:var(--muted)] hover:bg-[color:var(--surface)] hover:text-[color:var(--text)]",
                        )}
                      >
                        {item.icon}
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {onLogout ? (
              <div className="border-t border-[color:var(--border)] p-3">
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[color:var(--danger)] transition hover:bg-[color:var(--danger)]/10"
                >
                  <LogOut className="h-5 w-5" />
                  Cerrar sesión
                </button>
              </div>
            ) : null}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

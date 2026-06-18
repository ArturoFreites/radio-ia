"use client";

import { Bell, Menu } from "lucide-react";
import { AironLogo } from "@/components/brand/AironLogo";
import { cn } from "@/lib/utils";

export type MobileTopbarProps = {
  radioNombre: string;
  usuarioIniciales?: string;
  onOpenMenu: () => void;
  onNotifications?: () => void;
  className?: string;
};

export function MobileTopbar({
  radioNombre,
  usuarioIniciales = "AR",
  onOpenMenu,
  onNotifications,
  className,
}: MobileTopbarProps): React.ReactElement {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[color:var(--border)] bg-[color:var(--background)]/90 px-4 backdrop-blur-md md:hidden",
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menú"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[color:var(--muted)] transition hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--text)]"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5">
        <AironLogo size="xs" />
        <span className="truncate text-[10px] text-[color:var(--muted)]">{radioNombre}</span>
      </div>
      <button
        type="button"
        aria-label="Notificaciones"
        onClick={onNotifications}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[color:var(--muted)] transition hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--text)]"
      >
        <Bell className="h-5 w-5" />
      </button>
      <div
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)] text-xs font-bold text-[color:var(--primary-foreground)]"
      >
        {usuarioIniciales}
      </div>
    </header>
  );
}

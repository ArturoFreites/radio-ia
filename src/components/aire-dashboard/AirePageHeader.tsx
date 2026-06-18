"use client";

import { Bell, ChevronDown, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

export type AirePageHeaderProps = {
  radioNombre: string;
  usuarioNombre: string;
  aireToken?: string | null;
  className?: string;
};

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "AR";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0] ?? ""}${partes[1][0] ?? ""}`.toUpperCase();
}

export function AirePageHeader({
  radioNombre,
  usuarioNombre,
  aireToken = null,
  className,
}: AirePageHeaderProps): React.ReactElement {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const cabinaRef = useRef<Window | null>(null);

  useEffect(() => {
    const onPointer = (event: MouseEvent): void => {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  const abrirCabina = (): void => {
    if (!aireToken) return;
    if (cabinaRef.current && !cabinaRef.current.closed) {
      cabinaRef.current.focus();
      return;
    }
    cabinaRef.current = window.open(
      `/cabina?token=${encodeURIComponent(aireToken)}`,
      "aire_vivo",
    );
  };

  return (
    <header className={cn("mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between", className)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Aire</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">Gestiona tu transmisión en vivo</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!aireToken}
          onClick={abrirCabina}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-[color:var(--surface)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_rgba(255,255,255,0.04)] transition hover:border-[color:var(--primary)]/30 hover:bg-[color:var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles className="h-4 w-4 text-[color:var(--primary)]" aria-hidden />
          Abrir cabina IA
        </button>

        <button
          type="button"
          aria-label="Notificaciones"
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-[color:var(--surface)] text-[color:var(--muted)] transition hover:text-white"
        >
          <Bell className="h-5 w-5" aria-hidden />
          <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--primary)] px-1 text-[10px] font-bold text-[color:var(--primary-foreground)]">
            3
          </span>
        </button>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[color:var(--surface)] py-1.5 pl-1.5 pr-3 transition hover:bg-[color:var(--surface-soft)]"
            onClick={() => setProfileOpen((prev) => !prev)}
          >
            <div
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--primary)] text-xs font-bold text-[color:var(--primary-foreground)]"
            >
              {iniciales(usuarioNombre)}
            </div>
            <div className="hidden min-w-0 text-left sm:block">
              <p className="truncate text-sm font-medium text-white">{radioNombre}</p>
              <p className="truncate text-xs text-[color:var(--muted)]">Admin</p>
            </div>
            <ChevronDown className="h-4 w-4 text-[color:var(--muted)]" aria-hidden />
          </button>

          {profileOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[12rem] overflow-hidden rounded-2xl border border-white/[0.08] bg-[color:var(--surface)] py-1 shadow-[var(--shadow-dropdown)]"
            >
              <div className="border-b border-white/[0.08] px-4 py-3">
                <p className="text-sm font-medium text-white">{radioNombre}</p>
                <p className="mt-0.5 truncate text-xs text-[color:var(--muted)]">{usuarioNombre}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                className="w-full px-4 py-2.5 text-left text-sm text-[color:var(--muted)] transition hover:bg-[color:var(--surface-soft)] hover:text-white"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Cerrar sesión
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

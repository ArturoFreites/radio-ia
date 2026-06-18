"use client";

import { cn } from "@/lib/utils";

export type AireScopedOverlayProps = {
  visible: boolean;
  /** Si true, el overlay queda contenido en el card de playback (no pantalla completa). */
  scoped?: boolean;
  children: React.ReactNode;
};

export function AireScopedOverlay({
  visible,
  scoped = false,
  children,
}: AireScopedOverlayProps): React.ReactElement {
  return (
    <div
      className={cn(
        "pointer-events-none flex items-center justify-center bg-[#09090f]/88 backdrop-blur-[2px] transition-opacity duration-500",
        scoped ? "absolute inset-0 z-50 rounded-[inherit]" : "fixed inset-0 z-[60]",
        visible ? "opacity-100" : "opacity-0",
      )}
      aria-hidden={!visible}
    >
      <div
        className={cn(
          "w-full max-w-sm border border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-7 shadow-[var(--shadow-dropdown)] transition-all duration-500",
          scoped ? "mx-4" : "mx-8 max-w-lg",
          "rounded-[var(--r-xl)]",
          visible ? "translate-y-0 scale-100" : "translate-y-3 scale-[0.98]",
        )}
      >
        {children}
      </div>
    </div>
  );
}

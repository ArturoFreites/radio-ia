"use client";

import { Toaster } from "sonner";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <SessionProvider>
      {children}
      <Toaster
        theme="dark"
        toastOptions={{
          classNames: {
            toast:
              "rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--text)] shadow-[var(--shadow-dropdown)]",
            title: "text-sm font-semibold",
            description: "text-[color:var(--muted)]",
            success: "border-[color:var(--success)]/30",
            error: "border-[color:var(--danger)]/30",
            warning: "border-[color:var(--warning)]/30",
            info: "border-[color:var(--cyan)]/30",
          },
        }}
      />
    </SessionProvider>
  );
}

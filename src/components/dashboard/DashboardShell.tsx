"use client";

import { useState } from "react";
import { MobileTopbar } from "@/components/dashboard/MobileTopbar";
import { Sidebar } from "@/components/dashboard/Sidebar";

type DashboardShellProps = {
  radioNombre: string;
  userNombre: string;
  aireToken?: string | null;
  children: React.ReactNode;
};

export function DashboardShell({
  radioNombre,
  userNombre,
  aireToken = null,
  children,
}: DashboardShellProps): React.ReactElement {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[color:var(--background)]">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <Sidebar
        aireToken={aireToken}
        radioNombre={radioNombre}
        userNombre={userNombre}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <MobileTopbar
        radioNombre={radioNombre}
        usuarioIniciales={userNombre}
        onOpenMenu={() => setMobileOpen(true)}
      />

      <div className="min-w-0 md:ml-[var(--sidebar-width)]">
        <div className="mx-auto max-w-[1440px] p-4 pt-[4.5rem] md:p-8 md:pt-8">{children}</div>
      </div>
    </div>
  );
}

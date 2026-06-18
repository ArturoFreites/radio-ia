"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { DemoPublicidadPanel } from "@/components/publicidad/DemoPublicidadPanel";
import { PublicidadCatalogo } from "@/components/publicidad/PublicidadCatalogo";
import { PublicidadPagosPanel } from "@/components/publicidad/PublicidadPagosPanel";
import type { LocutorRowData } from "@/components/monetizacion/LocutorRow";
import type { PublicidadCliente } from "@/types/publicidad";

type PublicidadManagerProps = {
  clientes: PublicidadCliente[];
  voces: LocutorRowData[];
  aireToken: string;
};

type TabId = "catalogo" | "pagos" | "demo";

const TABS: Array<{ id: TabId; href: string; label: string }> = [
  { id: "catalogo", href: "/publicidad", label: "Catálogo" },
  { id: "pagos", href: "/publicidad?tab=pagos", label: "Pagos mensuales" },
  { id: "demo", href: "/publicidad?tab=demo", label: "Demo" },
];

function resolveTab(tabParam: string | null): TabId {
  if (tabParam === "pagos") return "pagos";
  if (tabParam === "demo") return "demo";
  return "catalogo";
}

export function PublicidadManager({
  clientes,
  voces,
  aireToken,
}: PublicidadManagerProps): React.ReactElement {
  const searchParams = useSearchParams();
  const activeTab = resolveTab(searchParams.get("tab"));

  const tabDescriptions = useMemo(
    (): Record<TabId, string> => ({
      catalogo: "Anunciantes y textos para rotación en vivo",
      pagos: "Control mensual de cobros por anunciante",
      demo: "Generador rápido para mostrar a clientes potenciales",
    }),
    [],
  );

  return (
    <main className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--primary)]">
          Monetización
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[color:var(--text)]">Publicidad</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">{tabDescriptions[activeTab]}</p>
      </div>

      <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
        {TABS.map((tab) => (
          <a
            key={tab.id}
            href={tab.href}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition",
              activeTab === tab.id ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200",
            )}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {activeTab === "catalogo" ? <PublicidadCatalogo initialClientes={clientes} /> : null}
      {activeTab === "pagos" ? <PublicidadPagosPanel /> : null}
      {activeTab === "demo" ? <DemoPublicidadPanel aireToken={aireToken} voces={voces} /> : null}
    </main>
  );
}

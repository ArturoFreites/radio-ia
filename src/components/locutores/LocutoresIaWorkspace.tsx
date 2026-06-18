"use client";

import Link from "next/link";
import { Megaphone, Mic2 } from "lucide-react";
import { AironLogo } from "@/components/brand/AironLogo";
import { LocutoresIaPanel } from "@/components/monetizacion/LocutoresIaPanel";
import type { GeneroVoz, TonoVoz } from "@prisma/client";

type VozItem = {
  id: string;
  alias: string | null;
  nombreAlAire: string | null;
  personalidad: string | null;
  voz: {
    id: string;
    nombre: string;
    descripcion: string;
    genero: GeneroVoz;
    tono: TonoVoz;
    idioma: string;
    geminiVoiceId: string;
    previewUrl: string | null;
  };
};

export type LocutoresIaWorkspaceProps = {
  voces: VozItem[];
};

export function LocutoresIaWorkspace({ voces }: LocutoresIaWorkspaceProps): React.ReactElement {
  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--primary)]">
            Voces sintéticas
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[color:var(--text)] sm:text-3xl">
            Locutores IA
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
            Catálogo de voces ElevenLabs para programas, diálogos y cuñas. Cada locutor tiene nombre al aire y
            personalidad propia.
          </p>
        </div>
        <AironLogo size="sm" className="hidden shrink-0 sm:block" />
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <LocutoresIaPanel initialVoces={voces} compact={false} />

        <aside className="space-y-3">
          <div className="rounded-[var(--r-xl)] border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--purple)]/15 text-[color:var(--purple)]">
              <Mic2 className="h-4 w-4" aria-hidden />
            </div>
            <h2 className="text-sm font-semibold text-[color:var(--text)]">Uso en la radio</h2>
            <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
              Asigná locutores en la grilla, en bloques del editor y en interrupciones DJ. Las voces disponibles
              aparecen en todos esos selectores.
            </p>
          </div>

          <Link
            href="/publicidad?tab=demo"
            className="flex items-start gap-3 rounded-[var(--r-xl)] border border-[color:var(--border)] bg-[color:var(--surface)] p-4 transition hover:border-[color:var(--warning)]/40 hover:bg-[color:var(--surface-soft)]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--warning)]/15 text-[color:var(--warning)]">
              <Megaphone className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[color:var(--text)]">Demo publicitaria</p>
              <p className="mt-0.5 text-xs text-[color:var(--muted)]">
                Generá y escuchá cuñas de prueba en Publicidad → Demo.
              </p>
            </div>
          </Link>
        </aside>
      </div>
    </main>
  );
}

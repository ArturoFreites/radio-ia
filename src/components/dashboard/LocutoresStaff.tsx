"use client";

import { VocesManager } from "@/components/dashboard/VocesManager";
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
    geminiVoiceId: string;
  };
};

type LocutoresStaffProps = {
  voces: VozItem[];
};

export function LocutoresStaff({ voces }: LocutoresStaffProps): React.ReactElement {
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Locutores</h1>
      <VocesManager initialVoces={voces} />
    </main>
  );
}

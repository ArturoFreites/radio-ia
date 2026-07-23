"use client";

import { FormEvent, useState } from "react";
import { FolderPlus, Music2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CarpetaAudiosCard } from "@/components/audios/CarpetaAudiosCard";

export type ModoRotacionAudio = "SECUENCIAL" | "ALEATORIO";

export type AudioCarpeta = {
  id: string;
  radioId: string;
  nombre: string;
  modoRotacion: ModoRotacionAudio;
  esActiva: boolean;
  archivosCount: number;
};

export type AudioArchivo = {
  id: string;
  carpetaId: string;
  nombre: string;
  audioUrl: string;
  duracionSec: number | null;
  orden: number;
  esActivo: boolean;
};

export type AudiosBibliotecaProps = {
  initialCarpetas: AudioCarpeta[];
  aireToken: string;
};

const MODOS_ROTACION: Array<{ value: ModoRotacionAudio; label: string }> = [
  { value: "SECUENCIAL", label: "Secuencial (uno tras otro)" },
  { value: "ALEATORIO", label: "Aleatorio" },
];

export function AudiosBiblioteca({ initialCarpetas, aireToken }: AudiosBibliotecaProps): React.ReactElement {
  const [carpetas, setCarpetas] = useState<AudioCarpeta[]>(initialCarpetas);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [modoNuevo, setModoNuevo] = useState<ModoRotacionAudio>("SECUENCIAL");
  const [creando, setCreando] = useState(false);

  async function crearCarpeta(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nombre = nombreNuevo.trim();
    if (!nombre) {
      toast.error("El nombre de la carpeta es obligatorio");
      return;
    }
    setCreando(true);
    try {
      const res = await fetch("/api/audios/carpetas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, modoRotacion: modoNuevo }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(typeof err?.error === "string" ? err.error : "No se pudo crear la carpeta");
      }
      const creada = (await res.json()) as AudioCarpeta;
      setCarpetas((prev) => [creada, ...prev]);
      setNombreNuevo("");
      setModoNuevo("SECUENCIAL");
      toast.success("Carpeta creada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la carpeta");
    } finally {
      setCreando(false);
    }
  }

  function actualizarCarpeta(carpetaId: string, patch: Partial<AudioCarpeta>): void {
    setCarpetas((prev) => prev.map((c) => (c.id === carpetaId ? { ...c, ...patch } : c)));
  }

  function eliminarCarpetaDeLista(carpetaId: string): void {
    setCarpetas((prev) => prev.filter((c) => c.id !== carpetaId));
  }

  return (
    <main className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--primary)]">Biblioteca</p>
        <h1 className="mt-1 text-2xl font-semibold text-[color:var(--text)]">Audios</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Jingles, IDs de estación y cortinas pregrabadas para insertar en el aire desde la grilla DJ.
        </p>
      </div>

      <Card className="p-4 sm:p-5">
        <form className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end" onSubmit={(e) => void crearCarpeta(e)}>
          <Input
            label="Nueva carpeta"
            placeholder="Ej: Jingles, IDs estación, Cortinas"
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
          />
          <Select label="Rotación" value={modoNuevo} onChange={(e) => setModoNuevo(e.target.value as ModoRotacionAudio)}>
            {MODOS_ROTACION.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
          <Button type="submit" disabled={creando} iconLeft={<FolderPlus className="h-4 w-4" aria-hidden />}>
            {creando ? "Creando…" : "Crear carpeta"}
          </Button>
        </form>
      </Card>

      {carpetas.length === 0 ? (
        <Card className="flex items-center gap-3 border-dashed text-[color:var(--muted)]">
          <Music2 className="h-5 w-5 opacity-50" aria-hidden />
          <p className="text-sm">No hay carpetas todavía. Creá la primera arriba.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {carpetas.map((carpeta) => (
            <CarpetaAudiosCard
              key={carpeta.id}
              aireToken={aireToken}
              carpeta={carpeta}
              onCambio={(patch) => actualizarCarpeta(carpeta.id, patch)}
              onEliminada={() => eliminarCarpetaDeLista(carpeta.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Check, Music2, Pause, Play, Pencil, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { AudioArchivo, AudioCarpeta, ModoRotacionAudio } from "@/components/audios/AudiosBiblioteca";
import { cn } from "@/lib/utils";

export type CarpetaAudiosCardProps = {
  carpeta: AudioCarpeta;
  aireToken: string;
  onCambio: (patch: Partial<AudioCarpeta>) => void;
  onEliminada: () => void;
};

const MODOS_ROTACION: Array<{ value: ModoRotacionAudio; label: string }> = [
  { value: "SECUENCIAL", label: "Secuencial" },
  { value: "ALEATORIO", label: "Aleatorio" },
];

function formatDuracion(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return "—";
  const minutos = Math.floor(sec / 60);
  const segundos = Math.round(sec % 60);
  return `${minutos}:${String(segundos).padStart(2, "0")}`;
}

export function CarpetaAudiosCard({
  carpeta,
  aireToken,
  onCambio,
  onEliminada,
}: CarpetaAudiosCardProps): React.ReactElement {
  const [archivos, setArchivos] = useState<AudioArchivo[]>([]);
  const [cargandoArchivos, setCargandoArchivos] = useState(true);
  const [nombreEdit, setNombreEdit] = useState(carpeta.nombre);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [eliminandoCarpeta, setEliminandoCarpeta] = useState(false);
  const [nombreArchivoNuevo, setNombreArchivoNuevo] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [eliminandoArchivoId, setEliminandoArchivoId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setCargandoArchivos(true);
      const res = await fetch(`/api/audios/carpetas/${carpeta.id}/archivos`);
      if (cancelled) return;
      if (res.ok) {
        const data = (await res.json()) as AudioArchivo[];
        setArchivos(data);
      }
      setCargandoArchivos(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [carpeta.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingId) {
      audio.src = `/api/aire/audio-biblioteca/${playingId}?token=${encodeURIComponent(aireToken)}`;
      audio.load();
      void audio.play().catch(() => setPlayingId(null));
    } else {
      audio.pause();
      audio.removeAttribute("src");
    }
  }, [playingId, aireToken]);

  function togglePlay(archivoId: string): void {
    setPlayingId((prev) => (prev === archivoId ? null : archivoId));
  }

  async function guardarNombre(): Promise<void> {
    const nombre = nombreEdit.trim();
    if (!nombre || nombre === carpeta.nombre) {
      setEditandoNombre(false);
      setNombreEdit(carpeta.nombre);
      return;
    }
    setGuardandoNombre(true);
    try {
      const res = await fetch(`/api/audios/carpetas/${carpeta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre }),
      });
      if (!res.ok) throw new Error("No se pudo renombrar la carpeta");
      onCambio({ nombre });
      setEditandoNombre(false);
      toast.success("Carpeta renombrada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo renombrar la carpeta");
    } finally {
      setGuardandoNombre(false);
    }
  }

  async function cambiarModoRotacion(modoRotacion: ModoRotacionAudio): Promise<void> {
    try {
      const res = await fetch(`/api/audios/carpetas/${carpeta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modoRotacion }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar la rotación");
      onCambio({ modoRotacion });
    } catch {
      toast.error("No se pudo cambiar el modo de rotación");
    }
  }

  async function toggleCarpetaActiva(esActiva: boolean): Promise<void> {
    try {
      const res = await fetch(`/api/audios/carpetas/${carpeta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ esActiva }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar el estado");
      onCambio({ esActiva });
    } catch {
      toast.error("No se pudo cambiar el estado de la carpeta");
    }
  }

  async function eliminarCarpeta(): Promise<void> {
    if (
      !window.confirm(
        `¿Eliminar la carpeta "${carpeta.nombre}" y todos sus audios? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setEliminandoCarpeta(true);
    try {
      const res = await fetch(`/api/audios/carpetas/${carpeta.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo eliminar la carpeta");
      toast.success("Carpeta eliminada");
      onEliminada();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la carpeta");
      setEliminandoCarpeta(false);
    }
  }

  async function subirArchivo(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Elegí un archivo de audio");
      return;
    }
    setSubiendo(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (nombreArchivoNuevo.trim()) form.append("nombre", nombreArchivoNuevo.trim());
      const res = await fetch(`/api/audios/carpetas/${carpeta.id}/archivos`, { method: "POST", body: form });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(typeof err?.error === "string" ? err.error : "No se pudo subir el audio");
      }
      const creado = (await res.json()) as AudioArchivo;
      setArchivos((prev) => [...prev, creado].sort((a, b) => a.orden - b.orden));
      if (creado.esActivo) onCambio({ archivosCount: carpeta.archivosCount + 1 });
      setNombreArchivoNuevo("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Audio subido");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir el audio");
    } finally {
      setSubiendo(false);
    }
  }

  async function toggleArchivoActivo(archivo: AudioArchivo, esActivo: boolean): Promise<void> {
    try {
      const res = await fetch(`/api/audios/archivos/${archivo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ esActivo }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar");
      setArchivos((prev) => prev.map((a) => (a.id === archivo.id ? { ...a, esActivo } : a)));
      onCambio({ archivosCount: Math.max(0, carpeta.archivosCount + (esActivo ? 1 : -1)) });
    } catch {
      toast.error("No se pudo cambiar el estado del audio");
    }
  }

  async function eliminarArchivo(archivo: AudioArchivo): Promise<void> {
    if (!window.confirm(`¿Eliminar "${archivo.nombre}"? Esta acción no se puede deshacer.`)) return;
    setEliminandoArchivoId(archivo.id);
    try {
      const res = await fetch(`/api/audios/archivos/${archivo.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo eliminar el audio");
      setArchivos((prev) => prev.filter((a) => a.id !== archivo.id));
      if (archivo.esActivo) onCambio({ archivosCount: Math.max(0, carpeta.archivosCount - 1) });
      if (playingId === archivo.id) setPlayingId(null);
      toast.success("Audio eliminado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el audio");
    } finally {
      setEliminandoArchivoId(null);
    }
  }

  return (
    <Card className={cn("space-y-4 p-4 sm:p-5", !carpeta.esActiva && "opacity-60")}>
      <audio ref={audioRef} className="hidden" onEnded={() => setPlayingId(null)} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--surface-2)] text-[color:var(--muted)]">
            <Music2 className="h-4.5 w-4.5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            {editandoNombre ? (
              <div className="flex items-center gap-1.5">
                <Input
                  autoFocus
                  className="py-1.5"
                  value={nombreEdit}
                  onChange={(e) => setNombreEdit(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void guardarNombre();
                    if (e.key === "Escape") {
                      setEditandoNombre(false);
                      setNombreEdit(carpeta.nombre);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="px-2"
                  disabled={guardandoNombre}
                  onClick={() => void guardarNombre()}
                  aria-label="Confirmar nombre"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="px-2"
                  disabled={guardandoNombre}
                  onClick={() => {
                    setEditandoNombre(false);
                    setNombreEdit(carpeta.nombre);
                  }}
                  aria-label="Cancelar edición"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className="group flex items-center gap-1.5 truncate text-left"
                onClick={() => setEditandoNombre(true)}
              >
                <span className="truncate font-semibold text-[color:var(--text)]">{carpeta.nombre}</span>
                <Pencil
                  className="h-3.5 w-3.5 shrink-0 text-[color:var(--muted)] opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </button>
            )}
            <p className="mt-0.5 text-xs text-[color:var(--muted)]">
              {carpeta.archivosCount} audio{carpeta.archivosCount === 1 ? "" : "s"} activo
              {carpeta.archivosCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={eliminandoCarpeta}
          onClick={() => void eliminarCarpeta()}
          aria-label="Eliminar carpeta"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          className="w-auto py-1.5 pr-9 text-xs"
          value={carpeta.modoRotacion}
          onChange={(e) => void cambiarModoRotacion(e.target.value as ModoRotacionAudio)}
          aria-label="Modo de rotación"
        >
          {MODOS_ROTACION.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-1.5 text-xs text-[color:var(--muted)]">
          <input
            type="checkbox"
            checked={carpeta.esActiva}
            onChange={(e) => void toggleCarpetaActiva(e.target.checked)}
          />
          Carpeta activa
        </label>
      </div>

      <form className="flex flex-wrap items-end gap-2 border-t border-[color:var(--border)] pt-3" onSubmit={(e) => void subirArchivo(e)}>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/ogg,.mp3,.wav,.m4a,.ogg"
          className="max-w-[220px] text-xs text-[color:var(--muted)]"
        />
        <Input
          className="max-w-[160px] py-1.5"
          placeholder="Nombre (opcional)"
          value={nombreArchivoNuevo}
          onChange={(e) => setNombreArchivoNuevo(e.target.value)}
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={subiendo}
          iconLeft={<UploadCloud className="h-3.5 w-3.5" aria-hidden />}
        >
          {subiendo ? "Subiendo…" : "Subir audio"}
        </Button>
      </form>

      <div className="space-y-1.5">
        {cargandoArchivos ? (
          <p className="text-sm text-[color:var(--muted)]">Cargando audios…</p>
        ) : archivos.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">No hay audios en esta carpeta todavía.</p>
        ) : (
          archivos.map((archivo) => (
            <div
              key={archivo.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-2.5 py-2",
                !archivo.esActivo && "opacity-50",
              )}
            >
              <Button
                type="button"
                variant="icon"
                size="sm"
                className="shrink-0"
                onClick={() => togglePlay(archivo.id)}
                aria-label={playingId === archivo.id ? "Pausar" : "Reproducir"}
              >
                {playingId === archivo.id ? (
                  <Pause className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Play className="h-3.5 w-3.5" aria-hidden />
                )}
              </Button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[color:var(--text)]">{archivo.nombre}</p>
                <p className="font-mono text-[11px] text-[color:var(--muted)]">{formatDuracion(archivo.duracionSec)}</p>
              </div>
              <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-[color:var(--muted)]">
                <input
                  type="checkbox"
                  checked={archivo.esActivo}
                  onChange={(e) => void toggleArchivoActivo(archivo, e.target.checked)}
                />
                Activo
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 px-2 text-[color:var(--danger)]"
                disabled={eliminandoArchivoId === archivo.id}
                onClick={() => void eliminarArchivo(archivo)}
                aria-label="Eliminar audio"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

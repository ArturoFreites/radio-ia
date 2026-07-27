"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Music2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AudioGeneradoCard } from "@/components/audios/AudioGeneradoCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import type { AudioGeneradoItem, TipoAudioGenerado } from "@/lib/audios/catalogoGenerados";

export type AudiosGeneradosCatalogoProps = {
  initialItems: AudioGeneradoItem[];
};

const FILTROS_TIPO: Array<{ value: "" | TipoAudioGenerado; label: string }> = [
  { value: "", label: "Todos los tipos" },
  { value: "PRESENTACION", label: "Presentaciones" },
  { value: "INTRO_APERTURA", label: "Intros" },
  { value: "TRANSICION_SLOT", label: "Transiciones" },
  { value: "PUBLICIDAD", label: "Publicidad" },
];

function AudiosSeccionTabs({ activa }: { activa: "biblioteca" | "generados" }): React.ReactElement {
  return (
    <div
      className="inline-flex w-full max-w-md rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] p-1"
      role="tablist"
    >
      <Link
        href="/audios"
        role="tab"
        aria-selected={activa === "biblioteca"}
        className={cn(
          "flex-1 rounded-full px-4 py-2 text-center text-sm font-medium transition-all duration-[var(--t-fast)]",
          activa === "biblioteca"
            ? "bg-[color:var(--primary)] text-[color:var(--primary-foreground)]"
            : "text-[color:var(--muted)] hover:text-[color:var(--text)]",
        )}
      >
        Biblioteca
      </Link>
      <Link
        href="/audios/generados"
        role="tab"
        aria-selected={activa === "generados"}
        className={cn(
          "flex-1 rounded-full px-4 py-2 text-center text-sm font-medium transition-all duration-[var(--t-fast)]",
          activa === "generados"
            ? "bg-[color:var(--primary)] text-[color:var(--primary-foreground)]"
            : "text-[color:var(--muted)] hover:text-[color:var(--text)]",
        )}
      >
        Generados
      </Link>
    </div>
  );
}

export function AudiosGeneradosCatalogo({
  initialItems,
}: AudiosGeneradosCatalogoProps): React.ReactElement {
  const [items, setItems] = useState<AudioGeneradoItem[]>(initialItems);
  const [tipo, setTipo] = useState<"" | TipoAudioGenerado>("");
  const [q, setQ] = useState("");
  const [cargando, setCargando] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const busquedaRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detenerAudio = useCallback((): void => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    }
    setPlayingId(null);
  }, []);

  useEffect(() => {
    return () => {
      detenerAudio();
      if (busquedaRef.current) clearTimeout(busquedaRef.current);
    };
  }, [detenerAudio]);

  const cargar = useCallback(async (filtroTipo: "" | TipoAudioGenerado, query: string): Promise<void> => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (filtroTipo) params.set("tipo", filtroTipo);
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/audios/generados?${params.toString()}`);
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(typeof err?.error === "string" ? err.error : "No se pudo cargar el catálogo");
      }
      const data = (await res.json()) as { items: AudioGeneradoItem[] };
      setItems(data.items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el catálogo");
    } finally {
      setCargando(false);
    }
  }, []);

  function onCambioTipo(value: "" | TipoAudioGenerado): void {
    setTipo(value);
    detenerAudio();
    void cargar(value, q);
  }

  function onCambioBusqueda(value: string): void {
    setQ(value);
    if (busquedaRef.current) clearTimeout(busquedaRef.current);
    busquedaRef.current = setTimeout(() => {
      detenerAudio();
      void cargar(tipo, value);
    }, 300);
  }

  function togglePlay(item: AudioGeneradoItem): void {
    if (!item.tieneAudio) return;
    const key = `${item.tipo}:${item.id}`;

    if (playingId === key && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }

    detenerAudio();
    const audio = new Audio(item.streamUrl);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => {
      toast.error("No se pudo reproducir el audio");
      setPlayingId(null);
    };
    void audio.play().then(() => setPlayingId(key)).catch(() => {
      toast.error("No se pudo reproducir el audio");
      setPlayingId(null);
    });
  }

  function descargar(item: AudioGeneradoItem): void {
    if (!item.tieneAudio) return;
    const url = item.streamUrl.includes("?")
      ? `${item.streamUrl}&download=1`
      : `${item.streamUrl}?download=1`;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = item.nombreDescarga;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <main className="space-y-6">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--primary)]">
            Audios
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[color:var(--text)]">Generados con IA</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Presentaciones DJ, intros, transiciones y publicidades TTS. Escuchá a qué refieren y
            descargalos con un nombre legible.
          </p>
        </div>
        <AudiosSeccionTabs activa="generados" />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Input
          type="search"
          label="Buscar"
          placeholder="Título o contexto…"
          value={q}
          onChange={(e) => onCambioBusqueda(e.target.value)}
        />
        <Select
          label="Tipo"
          value={tipo}
          onChange={(e) => onCambioTipo(e.target.value as "" | TipoAudioGenerado)}
        >
          {FILTROS_TIPO.map((f) => (
            <option key={f.value || "all"} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </div>

      {cargando ? (
        <p className="text-sm text-[color:var(--muted)]">Cargando…</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" aria-hidden />}
          title="Sin audios generados aún"
          description="Cuando la IA genere presentaciones, intros, transiciones o publicidades, van a aparecer acá."
        />
      ) : (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
            <Music2 className="h-3.5 w-3.5" aria-hidden />
            {items.length} audio{items.length === 1 ? "" : "s"}
          </p>
          {items.map((item) => {
            const key = `${item.tipo}:${item.id}`;
            return (
              <AudioGeneradoCard
                key={key}
                item={item}
                reproduciendo={playingId === key}
                onTogglePlay={() => togglePlay(item)}
                onDescargar={() => descargar(item)}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}

export { AudiosSeccionTabs };

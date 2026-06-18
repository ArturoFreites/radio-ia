"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, Pause, Pencil, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Waveform } from "@/components/airon/Waveform";
import { LocutorRow, type LocutorRowData } from "@/components/monetizacion/LocutorRow";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";

type DemoPublicidadPanelProps = {
  aireToken: string;
  voces: LocutorRowData[];
};

type PasoDemo = 1 | 2 | 3;

const PASOS: Array<{ id: PasoDemo; label: string }> = [
  { id: 1, label: "Comercio" },
  { id: 2, label: "Voz" },
  { id: 3, label: "Guion y audio" },
];

function contarPalabras(texto: string): number {
  const trimmed = texto.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function estimarSegundos(palabras: number): number {
  return Math.max(5, Math.round((palabras / 150) * 60));
}

function formatTiempo(segundos: number): string {
  const mins = Math.floor(segundos / 60);
  const secs = segundos % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function DemoPublicidadPanel({
  aireToken,
  voces,
}: DemoPublicidadPanelProps): React.ReactElement {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [paso, setPaso] = useState<PasoDemo>(1);
  const [comercio, setComercio] = useState("");
  const [vozId, setVozId] = useState<string | null>(voces[0]?.id ?? null);
  const [guion, setGuion] = useState("");
  const [editandoGuion, setEditandoGuion] = useState(false);
  const [generandoGuion, setGenerandoGuion] = useState(false);
  const [generandoAudio, setGenerandoAudio] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duracionAudio, setDuracionAudio] = useState(0);
  const [tiempoActual, setTiempoActual] = useState(0);

  const vozSeleccionada = useMemo(
    () => voces.find((v) => v.id === vozId) ?? null,
    [voces, vozId],
  );

  useEffect(() => {
    if (voces.length > 0 && !vozId) {
      setVozId(voces[0]?.id ?? null);
    }
  }, [voces, vozId]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      audioRef.current?.pause();
    };
  }, [audioUrl]);

  const limpiarAudio = useCallback((): void => {
    audioRef.current?.pause();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setPlaying(false);
    setDuracionAudio(0);
    setTiempoActual(0);
  }, [audioUrl]);

  const generarGuion = async (): Promise<void> => {
    const nombre = comercio.trim();
    if (!nombre) {
      toast.error("Ingresá el nombre del comercio");
      return;
    }
    setGenerandoGuion(true);
    try {
      const res = await fetch("/api/aire/publicidad-demo/guion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aireToken, negocio: nombre }),
      });
      if (!res.ok) {
        throw new Error("No se pudo generar el guión");
      }
      const data = (await res.json()) as { guion: string };
      setGuion(data.guion);
      setPaso(3);
      limpiarAudio();
      toast.success("Guión generado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al generar guión");
    } finally {
      setGenerandoGuion(false);
    }
  };

  const generarAudio = async (autoDownload = false): Promise<void> => {
    const texto = guion.trim();
    const item = voces.find((v) => v.id === vozId);
    if (!texto || !item) return;

    setGenerandoAudio(true);
    limpiarAudio();
    try {
      const res = await fetch("/api/aire/publicidad-demo/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aireToken,
          texto,
          voiceId: item.geminiVoiceId,
        }),
      });
      if (!res.ok) {
        throw new Error("No se pudo generar el audio");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioUrl(url);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onloadedmetadata = () => setDuracionAudio(Math.round(audio.duration));
      audio.ontimeupdate = () => setTiempoActual(Math.round(audio.currentTime));
      audio.onended = () => setPlaying(false);
      toast.success("Audio listo para escuchar");
      if (autoDownload) {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `demo-publicidad-${comercio.trim() || "airon"}.mp3`;
        anchor.click();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al generar audio");
    } finally {
      setGenerandoAudio(false);
    }
  };

  const togglePlay = (): void => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play().then(() => setPlaying(true)).catch(() => {
        toast.error("No se pudo reproducir");
      });
    }
  };

  const descargarAudio = (): void => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `demo-publicidad-${comercio.trim() || "airon"}.mp3`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const palabras = contarPalabras(guion);
  const segundosEstimados = estimarSegundos(palabras);
  const duracionDisplay = duracionAudio > 0 ? duracionAudio : segundosEstimados;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-[var(--r-xl)] border border-[color:var(--border)] bg-[color:var(--surface)] p-4 sm:p-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--purple)]/15 text-[color:var(--purple)]">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--text)]">Generador de demo</h2>
            <p className="mt-0.5 text-sm text-[color:var(--muted)]">
              Creá una cuña de prueba con guión y voz IA para mostrarle a un cliente potencial.
            </p>
          </div>
        </div>

        <ol className="mb-6 flex items-center gap-1">
          {PASOS.map((item, index) => {
            const done = paso > item.id;
            const active = paso === item.id;
            return (
              <li key={item.id} className="flex flex-1 items-center gap-1">
                <button
                  type="button"
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition",
                    done || active
                      ? "bg-[color:var(--purple)] text-white"
                      : "bg-[color:var(--surface-2)] text-[color:var(--muted)]",
                  )}
                  onClick={() => {
                    if (item.id === 1 || (item.id === 2 && comercio.trim()) || (item.id === 3 && guion.trim())) {
                      setPaso(item.id);
                    }
                  }}
                >
                  {item.id}
                </button>
                <span
                  className={cn(
                    "hidden truncate text-xs font-medium sm:inline",
                    active ? "text-[color:var(--text)]" : "text-[color:var(--muted)]",
                  )}
                >
                  {item.label}
                </span>
                {index < PASOS.length - 1 ? (
                  <span
                    aria-hidden
                    className={cn(
                      "hidden h-px flex-1 sm:block",
                      done ? "bg-[color:var(--purple)]" : "bg-[color:var(--border)]",
                    )}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>

        {paso === 1 ? (
          <div className="space-y-3">
            <Input
              label="Nombre del comercio"
              placeholder="Ej: Panadería San Martín"
              value={comercio}
              onChange={(event) => setComercio(event.target.value)}
            />
            <Button
              className="w-full"
              loading={generandoGuion}
              disabled={!comercio.trim()}
              onClick={() => void generarGuion()}
            >
              Generar guión con IA
            </Button>
            <Button
              className="w-full"
              variant="secondary"
              disabled={!comercio.trim()}
              onClick={() => {
                setGuion("");
                setPaso(2);
              }}
            >
              Elegir voz primero
            </Button>
          </div>
        ) : null}

        {paso === 2 ? (
          <div className="space-y-2">
            {voces.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">
                No hay locutores configurados.{" "}
                <Link href="/locutores" className="font-medium text-[color:var(--primary)] underline-offset-2 hover:underline">
                  Agregá voces en Locutores IA
                </Link>
                .
              </p>
            ) : (
              voces.map((row) => (
                <LocutorRow
                  key={row.id}
                  locutor={row}
                  selected={vozId === row.id}
                  onSelect={() => setVozId(row.id)}
                />
              ))
            )}
            <Button
              className="w-full"
              disabled={!vozId}
              onClick={() => {
                if (guion.trim()) {
                  setPaso(3);
                } else {
                  setPaso(1);
                }
              }}
            >
              Continuar
            </Button>
          </div>
        ) : null}

        {paso === 3 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-[color:var(--purple)]/40 bg-[color:var(--purple)]/5 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-[color:var(--purple)]">
                  Guion generado
                </h3>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-[color:var(--muted)] hover:text-[color:var(--text)]"
                  onClick={() => setEditandoGuion((prev) => !prev)}
                >
                  <Pencil className="h-3 w-3" />
                  Editar guion
                </button>
              </div>
              {editandoGuion ? (
                <Textarea
                  value={guion}
                  onChange={(event) => setGuion(event.target.value)}
                  rows={5}
                  className="border-[color:var(--purple)]/30 bg-[color:var(--surface-soft)] text-[color:var(--text)]"
                />
              ) : (
                <p className="text-sm leading-relaxed text-[color:var(--purple)]/90">{guion || "—"}</p>
              )}
              <p className="mt-2 text-xs text-[color:var(--muted)]">
                {palabras} palabras · {segundosEstimados} segundos
              </p>
            </div>

            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[color:var(--text)]">
                  Escuchá cómo sonaría en tu radio
                </h3>
                {audioBlob ? (
                  <button
                    type="button"
                    aria-label="Descargar audio"
                    className="rounded-lg p-1.5 text-[color:var(--muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text)]"
                    onClick={descargarAudio}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {vozSeleccionada ? (
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--purple)]/20 text-xs font-bold text-[color:var(--purple)]">
                    {(vozSeleccionada.nombreAlAire ?? vozSeleccionada.alias).charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-[color:var(--text)]">
                    {vozSeleccionada.nombreAlAire ?? vozSeleccionada.alias}
                  </span>
                </div>
              ) : null}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={!audioUrl}
                  aria-label={playing ? "Pausar" : "Reproducir"}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--purple)] text-white transition hover:brightness-110 disabled:opacity-40"
                  onClick={togglePlay}
                >
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
                <Waveform
                  active={playing || generandoAudio}
                  color="purple"
                  size="lg"
                  bars={12}
                  className="flex-1"
                />
                <span className="shrink-0 font-mono text-xs tabular-nums text-[color:var(--muted)]">
                  {formatTiempo(tiempoActual)} / {formatTiempo(duracionDisplay)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="secondary"
                className="flex-1"
                loading={generandoGuion}
                onClick={() => void generarGuion()}
              >
                Generar nuevo guion
              </Button>
              <Button
                className="flex-1 bg-[color:var(--purple)] text-white hover:brightness-110"
                loading={generandoAudio}
                disabled={!guion.trim() || !vozId}
                iconLeft={<Download className="h-4 w-4" />}
                onClick={() => void generarAudio(true)}
              >
                {audioBlob ? "Regenerar audio" : "Descargar audio"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

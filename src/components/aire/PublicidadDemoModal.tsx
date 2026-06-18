"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type VozDemo = {
  voiceId: string;
  nombre: string;
  nombreAlAire: string | null;
  genero: string;
};

type ModoGuion = "libre" | "negocio";

export type PublicidadDemoModalProps = {
  aireToken: string;
  open: boolean;
  onClose: () => void;
  onReproducir: (audioBlob: Blob) => Promise<void>;
};

export function PublicidadDemoModal({
  aireToken,
  open,
  onClose,
  onReproducir,
}: PublicidadDemoModalProps): React.ReactElement | null {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [modoGuion, setModoGuion] = useState<ModoGuion>("libre");
  const [negocio, setNegocio] = useState("");
  const [texto, setTexto] = useState("");
  const [generandoGuion, setGenerandoGuion] = useState(false);
  const [errorGuion, setErrorGuion] = useState<string | null>(null);
  const [voces, setVoces] = useState<VozDemo[]>([]);
  const [cargandoVoces, setCargandoVoces] = useState(false);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [generandoAudio, setGenerandoAudio] = useState(false);
  const [errorAudio, setErrorAudio] = useState<string | null>(null);

  const reset = useCallback((): void => {
    setPaso(1);
    setModoGuion("libre");
    setNegocio("");
    setTexto("");
    setGenerandoGuion(false);
    setErrorGuion(null);
    setVoces([]);
    setCargandoVoces(false);
    setVoiceId(null);
    setGenerandoAudio(false);
    setErrorAudio(null);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    setCargandoVoces(true);
    void fetch(`/api/aire/publicidad-demo/voces?token=${encodeURIComponent(aireToken)}`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { voces: VozDemo[] };
        setVoces(data.voces);
        if (data.voces.length > 0) {
          setVoiceId(data.voces[0]?.voiceId ?? null);
        }
      })
      .finally(() => setCargandoVoces(false));
  }, [aireToken, open, reset]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const generarGuion = useCallback(async (): Promise<void> => {
    const n = negocio.trim();
    if (!n) return;
    setGenerandoGuion(true);
    setErrorGuion(null);
    try {
      const res = await fetch("/api/aire/publicidad-demo/guion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aireToken, negocio: n }),
      });
      if (!res.ok) {
        setErrorGuion("No se pudo generar el guión. Escribí el texto manualmente.");
        return;
      }
      const data = (await res.json()) as { guion: string };
      setTexto(data.guion);
    } catch {
      setErrorGuion("No se pudo generar el guión. Escribí el texto manualmente.");
    } finally {
      setGenerandoGuion(false);
    }
  }, [aireToken, negocio]);

  const reproducirAhora = useCallback(async (): Promise<void> => {
    const t = texto.trim();
    if (!t || !voiceId) return;
    setGenerandoAudio(true);
    setErrorAudio(null);
    try {
      const res = await fetch("/api/aire/publicidad-demo/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aireToken, texto: t, voiceId }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setErrorAudio(payload?.error ?? "Error al generar el audio.");
        return;
      }
      const blob = await res.blob();
      onClose();
      await onReproducir(blob);
    } catch {
      setErrorAudio("Error al generar el audio.");
    } finally {
      setGenerandoAudio(false);
    }
  }, [aireToken, onClose, onReproducir, texto, voiceId]);

  if (!open) return null;

  const textoListo = texto.trim().length > 0;
  const sinVoces = !cargandoVoces && voces.length === 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:p-4">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex h-full max-h-full w-full flex-col border border-[color:var(--border)] bg-[color:var(--surface-soft)] shadow-[var(--shadow-dropdown)] md:h-auto md:max-h-[90vh] md:max-w-sm md:rounded-[var(--r-xl)]"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--primary)]">
              Paso {paso} de 2
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-white">
              {paso === 1 ? "Guión de la cuña" : "Elegir voz"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-xl p-2 text-[color:var(--muted)] transition hover:bg-white/[0.04] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {paso === 1 ? (
            <div className="flex flex-col gap-4">
              <div className="flex rounded-[var(--r-md)] border border-[color:var(--border)] p-1">
                <button
                  type="button"
                  onClick={() => setModoGuion("libre")}
                  className={cn(
                    "min-h-11 flex-1 rounded-[var(--r-sm)] text-sm font-medium transition",
                    modoGuion === "libre"
                      ? "bg-white/[0.08] text-white"
                      : "text-[color:var(--muted)]",
                  )}
                >
                  Texto libre
                </button>
                <button
                  type="button"
                  onClick={() => setModoGuion("negocio")}
                  className={cn(
                    "min-h-11 flex-1 rounded-[var(--r-sm)] text-sm font-medium transition",
                    modoGuion === "negocio"
                      ? "bg-white/[0.08] text-white"
                      : "text-[color:var(--muted)]",
                  )}
                >
                  Generar desde negocio
                </button>
              </div>

              {modoGuion === "negocio" ? (
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-[color:var(--muted)]" htmlFor="negocio-demo">
                    Nombre o descripción del comercio
                  </label>
                  <input
                    id="negocio-demo"
                    type="text"
                    value={negocio}
                    onChange={(e) => setNegocio(e.target.value)}
                    placeholder="Ej. Ferretería García"
                    className="min-h-11 rounded-[var(--r-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-white placeholder:text-[color:var(--muted)]/60"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!negocio.trim() || generandoGuion}
                    onClick={() => void generarGuion()}
                    className="w-full"
                  >
                    {generandoGuion ? "Generando guión…" : "Generar guión"}
                  </Button>
                  {errorGuion ? <p className="text-sm text-[color:var(--warning)]">{errorGuion}</p> : null}
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                <label className="text-sm text-[color:var(--muted)]" htmlFor="texto-demo">
                  Texto a leer
                </label>
                <textarea
                  id="texto-demo"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={8}
                  placeholder="Escribí o pegá el guión de la publicidad…"
                  className="min-h-[140px] rounded-[var(--r-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-white placeholder:text-[color:var(--muted)]/60"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {cargandoVoces ? (
                <p className="text-center text-sm text-[color:var(--muted)]">Cargando voces…</p>
              ) : sinVoces ? (
                <p className="rounded-[var(--r-md)] border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 px-3 py-3 text-sm text-[color:var(--warning)]">
                  No hay voces configuradas. Agregá una voz desde el dashboard.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {voces.map((v) => {
                    const label = v.nombreAlAire ?? v.nombre;
                    const selected = voiceId === v.voiceId;
                    return (
                      <li key={v.voiceId}>
                        <button
                          type="button"
                          onClick={() => setVoiceId(v.voiceId)}
                          className={cn(
                            "flex min-h-11 w-full items-center justify-between rounded-[var(--r-md)] border px-3 py-2 text-left transition",
                            selected
                              ? "border-[color:var(--primary)]/40 bg-[color:var(--primary-glow)] text-white"
                              : "border-[color:var(--border)] bg-[color:var(--surface)] text-zinc-200 hover:border-white/[0.16]",
                          )}
                        >
                          <span className="font-medium">{label}</span>
                          <span className="text-xs capitalize text-[color:var(--muted)]">
                            {v.genero.toLowerCase()}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {errorAudio ? <p className="text-sm text-[color:var(--danger)]">{errorAudio}</p> : null}
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-[color:var(--border)] p-5">
          {paso === 1 ? (
            <Button
              type="button"
              disabled={!textoListo}
              onClick={() => setPaso(2)}
              className="w-full"
            >
              Siguiente →
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <Button type="button" variant="ghost" onClick={() => setPaso(1)} className="w-full">
                ← Volver al guión
              </Button>
              <Button
                type="button"
                disabled={sinVoces || !voiceId || generandoAudio}
                loading={generandoAudio}
                onClick={() => void reproducirAhora()}
                className="w-full"
              >
                {generandoAudio ? "Generando audio…" : "Reproducir ahora"}
              </Button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}

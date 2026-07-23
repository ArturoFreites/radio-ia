"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Trash2, X } from "lucide-react";
import { SpotifyIcon } from "@/components/brand/SpotifyIcon";
import { useEffect, useMemo, useState } from "react";
import { HoraInicioInput } from "@/components/grilla/HoraInicioInput";
import { InterruptionConfigCard, type InterruptionCarpetaOption } from "@/components/grilla/InterruptionConfigCard";
import type { SlotFormTarget } from "@/components/grilla/SlotForm";
import { PlaylistPicker, type PlaylistPickerItem } from "@/components/airon/PlaylistPicker";
import { SlotWizard, type SlotWizardStep } from "@/components/airon/SlotWizard";
import { VoiceCard } from "@/components/airon/VoiceCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { GrillaEditorEventoRow, GrillaEditorSlotRow } from "@/types/grilla";
import type { SpotifyPlaylistRow } from "@/lib/spotify/api";
import { normalizePlaylistId } from "@/lib/spotify/playlistId";
import { usarApiSlotsSemanal } from "@/lib/grilla/slotPersistencia";
import { normalizarHoraHHMM } from "@/lib/grilla/tiempo";
import { cn } from "@/lib/utils";

const DIAS_SEMANA = [
  { valor: 1, etiqueta: "Lunes" },
  { valor: 2, etiqueta: "Martes" },
  { valor: 3, etiqueta: "Miércoles" },
  { valor: 4, etiqueta: "Jueves" },
  { valor: 5, etiqueta: "Viernes" },
  { valor: 6, etiqueta: "Sábado" },
  { valor: 0, etiqueta: "Domingo" },
];

type VozOptionRow = { voz: { id: string; nombre: string; personalidad?: string | null } };

type CarpetaAudioApiRow = { id: string; nombre: string; esActiva: boolean; archivosCount: number };

function playlistInicial(target: SlotFormTarget): { id: string; nombre: string } {
  if (target.kind === "editar-slot") {
    return {
      id: target.slot.playlistId ? normalizePlaylistId(target.slot.playlistId) : "",
      nombre: target.slot.playlistNombre ?? "",
    };
  }
  if (target.kind === "editar-evento") {
    return {
      id: target.evento.playlistId ? normalizePlaylistId(target.evento.playlistId) : "",
      nombre: target.evento.playlistNombre ?? "",
    };
  }
  return { id: "", nombre: "" };
}

function vozInicial(target: SlotFormTarget): string {
  if (target.kind === "editar-slot") return target.slot.voz1?.id ?? "";
  if (target.kind === "editar-evento") return target.evento.voz1?.id ?? "";
  return "";
}

function djConfigInicial(target: SlotFormTarget): {
  presentacionCadaTemas: number;
  djHoraActiva: boolean;
  djHoraIntervaloMin: number;
  djClimaActivo: boolean;
  djClimaIntervaloMin: number;
  djPublicidadActiva: boolean;
  djPublicidadIntervaloMin: number;
  djAudioActiva: boolean;
  djAudioIntervaloMin: number;
  djAudioCarpetaId: string | null;
} {
  const defaults = {
    presentacionCadaTemas: 2,
    djHoraActiva: false,
    djHoraIntervaloMin: 60,
    djClimaActivo: false,
    djClimaIntervaloMin: 90,
    djPublicidadActiva: false,
    djPublicidadIntervaloMin: 30,
    djAudioActiva: false,
    djAudioIntervaloMin: 45,
    djAudioCarpetaId: null,
  };
  const row: GrillaEditorSlotRow | GrillaEditorEventoRow | null =
    target.kind === "editar-slot"
      ? target.slot
      : target.kind === "editar-evento"
        ? target.evento
        : null;
  if (!row) return defaults;
  return {
    presentacionCadaTemas: row.presentacionCadaTemas,
    djHoraActiva: row.djHoraActiva,
    djHoraIntervaloMin: row.djHoraIntervaloMin ?? 60,
    djClimaActivo: row.djClimaActivo,
    djClimaIntervaloMin: row.djClimaIntervaloMin ?? 90,
    djPublicidadActiva: row.djPublicidadActiva,
    djPublicidadIntervaloMin: row.djPublicidadIntervaloMin ?? 30,
    djAudioActiva: row.djAudioActiva,
    djAudioIntervaloMin: row.djAudioIntervaloMin ?? 45,
    djAudioCarpetaId: row.djAudioCarpetaId,
  };
}

function hoyYmdLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fechaDbAInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function estadoHorarioInicial(target: SlotFormTarget): {
  modo: "semanal" | "evento";
  diaDeSemana: number;
  fecha: string;
  horaInicio: string;
  duracionMin: number;
} {
  if (target.kind === "nuevo-semanal") {
    return {
      modo: "semanal",
      diaDeSemana: target.defaults.diaDeSemana,
      fecha: hoyYmdLocal(),
      horaInicio: normalizarHoraHHMM(target.defaults.horaInicio) ?? "08:00",
      duracionMin: target.defaults.duracionMin,
    };
  }
  if (target.kind === "nuevo-evento") {
    const def = target.defaults;
    return {
      modo: "evento",
      diaDeSemana: 1,
      fecha: def?.fecha ?? hoyYmdLocal(),
      horaInicio: normalizarHoraHHMM(def?.horaInicio ?? "08:00") ?? "08:00",
      duracionMin: def?.duracionMin ?? 60,
    };
  }
  if (target.kind === "editar-slot") {
    const s = target.slot;
    return {
      modo: "semanal",
      diaDeSemana: s.diaDeSemana,
      fecha: hoyYmdLocal(),
      horaInicio: normalizarHoraHHMM(s.horaInicio) ?? "08:00",
      duracionMin: s.duracionMin,
    };
  }
  const e = target.evento;
  return {
    modo: "evento",
    diaDeSemana: 1,
    fecha: fechaDbAInput(e.fecha),
    horaInicio: normalizarHoraHHMM(e.horaInicio) ?? "08:00",
    duracionMin: e.duracionMin,
  };
}

function tituloDialog(target: SlotFormTarget): string {
  if (target.kind === "nuevo-semanal" || target.kind === "nuevo-evento") return "Crear slot";
  return "Editar slot";
}

export type SlotWizardDialogProps = {
  open: boolean;
  target: SlotFormTarget | null;
  onClose: () => void;
  onHecho: () => Promise<void>;
};

export function SlotWizardDialog({
  open,
  target,
  onClose,
  onHecho,
}: SlotWizardDialogProps): React.ReactElement | null {
  const [step, setStep] = useState<SlotWizardStep>("playlist");
  const [diaDeSemana, setDiaDeSemana] = useState(1);
  const [fecha, setFecha] = useState(hoyYmdLocal());
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [duracionMin, setDuracionMin] = useState(60);
  const [modo, setModo] = useState<"semanal" | "evento">("semanal");
  const [playlistId, setPlaylistId] = useState("");
  const [playlistNombre, setPlaylistNombre] = useState("");
  const [voz1Id, setVoz1Id] = useState("");
  const [presentacionActiva, setPresentacionActiva] = useState(true);
  const [presentacionCadaTemas, setPresentacionCadaTemas] = useState(2);
  const [djHoraActiva, setDjHoraActiva] = useState(false);
  const [djHoraIntervaloMin, setDjHoraIntervaloMin] = useState(60);
  const [djClimaActivo, setDjClimaActivo] = useState(false);
  const [djClimaIntervaloMin, setDjClimaIntervaloMin] = useState(90);
  const [djPublicidadActiva, setDjPublicidadActiva] = useState(false);
  const [djPublicidadIntervaloMin, setDjPublicidadIntervaloMin] = useState(30);
  const [djAudioActiva, setDjAudioActiva] = useState(false);
  const [djAudioIntervaloMin, setDjAudioIntervaloMin] = useState(45);
  const [djAudioCarpetaId, setDjAudioCarpetaId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sinSpotify, setSinSpotify] = useState(false);
  const [playlistsRaw, setPlaylistsRaw] = useState<SpotifyPlaylistRow[]>([]);
  const [cargandoPlaylists, setCargandoPlaylists] = useState(false);
  const [voces, setVoces] = useState<VozOptionRow[]>([]);
  const [cargandoVoces, setCargandoVoces] = useState(false);
  const [carpetasAudio, setCarpetasAudio] = useState<CarpetaAudioApiRow[]>([]);

  useEffect(() => {
    if (!open || !target) return;
    const hor = estadoHorarioInicial(target);
    const pl = playlistInicial(target);
    const dj = djConfigInicial(target);
    setStep("playlist");
    setModo(hor.modo);
    setDiaDeSemana(hor.diaDeSemana);
    setFecha(hor.fecha);
    setHoraInicio(hor.horaInicio);
    setDuracionMin(hor.duracionMin);
    setPlaylistId(pl.id);
    setPlaylistNombre(pl.nombre);
    setVoz1Id(vozInicial(target));
    setPresentacionActiva(dj.presentacionCadaTemas > 0);
    setPresentacionCadaTemas(Math.max(1, dj.presentacionCadaTemas));
    setDjHoraActiva(dj.djHoraActiva);
    setDjHoraIntervaloMin(dj.djHoraIntervaloMin);
    setDjClimaActivo(dj.djClimaActivo);
    setDjClimaIntervaloMin(dj.djClimaIntervaloMin);
    setDjPublicidadActiva(dj.djPublicidadActiva);
    setDjPublicidadIntervaloMin(dj.djPublicidadIntervaloMin);
    setDjAudioActiva(dj.djAudioActiva);
    setDjAudioIntervaloMin(dj.djAudioIntervaloMin);
    setDjAudioCarpetaId(dj.djAudioCarpetaId);
    setError(null);
  }, [open, target]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      setCargandoPlaylists(true);
      const res = await fetch("/api/spotify/playlists");
      if (cancelled) return;
      if (res.status === 400 || res.status === 401) {
        setSinSpotify(true);
        setPlaylistsRaw([]);
      } else if (res.ok) {
        setSinSpotify(false);
        setPlaylistsRaw((await res.json()) as SpotifyPlaylistRow[]);
      }
      setCargandoPlaylists(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      setCargandoVoces(true);
      const res = await fetch("/api/voces");
      if (cancelled) return;
      if (res.ok) setVoces((await res.json()) as VozOptionRow[]);
      setCargandoVoces(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/audios/carpetas");
      if (cancelled) return;
      if (res.ok) setCarpetasAudio((await res.json()) as CarpetaAudioApiRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const playlists: PlaylistPickerItem[] = useMemo(
    () =>
      playlistsRaw
        .filter((p) => p.canReadTracksViaApi)
        .map((p) => ({
          id: p.id,
          nombre: p.name,
          coverUrl: p.imageUrl ?? undefined,
          trackCount: p.tracksTotal,
          esPropia: p.canReadTracksViaApi,
        })),
    [playlistsRaw],
  );

  const carpetasOptions: InterruptionCarpetaOption[] = useMemo(
    () =>
      carpetasAudio
        .filter((c) => c.esActiva && c.archivosCount > 0)
        .map((c) => ({ id: c.id, nombre: c.nombre, archivosCount: c.archivosCount })),
    [carpetasAudio],
  );

  const esEdicion = target?.kind === "editar-slot" || target?.kind === "editar-evento";

  async function eliminar(): Promise<void> {
    if (!target || !esEdicion) return;
    const etiqueta = target.kind === "editar-slot" ? "este slot semanal" : "este evento puntual";
    if (!window.confirm(`¿Eliminar ${etiqueta}? Esta acción no se puede deshacer.`)) return;
    setEliminando(true);
    setError(null);
    try {
      const url =
        target.kind === "editar-slot"
          ? `/api/grilla/slots/${target.slot.id}`
          : `/api/grilla/eventos/${target.evento.id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        setError("No se pudo eliminar");
        return;
      }
      await onHecho();
      onClose();
    } finally {
      setEliminando(false);
    }
  }

  async function guardar(): Promise<void> {
    if (!target) return;
    setError(null);
    setEnviando(true);
    try {
      const djPayload = {
        playlistId: playlistId || null,
        playlistNombre: playlistNombre || null,
        voz1Id: voz1Id || null,
        voz2Id: null,
        presentacionCadaTemas: presentacionActiva ? Math.max(1, presentacionCadaTemas) : 1,
        djHoraActiva,
        djHoraIntervaloMin: djHoraActiva ? djHoraIntervaloMin : null,
        djClimaActivo,
        djClimaIntervaloMin: djClimaActivo ? djClimaIntervaloMin : null,
        djPublicidadActiva,
        djPublicidadIntervaloMin: djPublicidadActiva ? djPublicidadIntervaloMin : null,
        djAudioActiva,
        djAudioIntervaloMin: djAudioActiva ? djAudioIntervaloMin : null,
        djAudioCarpetaId: djAudioActiva ? djAudioCarpetaId : null,
      };
      if (djAudioActiva && !djAudioCarpetaId) {
        setError("Elegí una carpeta de audios para activar la interrupción de Audios");
        return;
      }
      const horaNorm = normalizarHoraHHMM(horaInicio);
      if (!horaNorm) {
        setError("Hora de inicio inválida");
        return;
      }
      const usarSlots = usarApiSlotsSemanal(target, modo);
      if (usarSlots) {
        const body = { diaDeSemana, horaInicio: horaNorm, duracionMin, ...djPayload };
        const url = target.kind === "editar-slot" ? `/api/grilla/slots/${target.slot.id}` : "/api/grilla/slots";
        const method = target.kind === "editar-slot" ? "PATCH" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = (await res.json()) as { error?: string };
          setError(typeof j.error === "string" ? j.error : "Error al guardar slot");
          return;
        }
      } else {
        const body = { fecha, horaInicio: horaNorm, duracionMin, ...djPayload };
        const url =
          target.kind === "editar-evento" ? `/api/grilla/eventos/${target.evento.id}` : "/api/grilla/eventos";
        const method = target.kind === "editar-evento" ? "PATCH" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = (await res.json()) as { error?: string };
          setError(typeof j.error === "string" ? j.error : "Error al guardar evento");
          return;
        }
      }
      await onHecho();
      onClose();
    } finally {
      setEnviando(false);
    }
  }

  if (!open || !target) return null;

  const stepIndex = step === "playlist" ? 0 : step === "voz" ? 1 : 2;
  const nextDisabled =
    (step === "playlist" && !playlistId) || (step === "voz" && !voz1Id);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4">
        <motion.button
          type="button"
          aria-label="Cerrar"
          className="absolute inset-0 bg-black/75"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="slot-wizard-title"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="relative z-10 flex h-[min(92dvh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[color:var(--border)] bg-[color:var(--background)] shadow-[var(--shadow-dropdown)] md:rounded-2xl"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
            <div>
              <h2 id="slot-wizard-title" className="text-lg font-semibold text-[color:var(--text)]">
                {tituloDialog(target)}
              </h2>
              <p className="mt-0.5 text-sm text-[color:var(--muted)]">
                Paso {stepIndex + 1} de 3 — {step === "playlist" ? "Elegí playlist" : step === "voz" ? "Elegí la voz" : "Configurá interrupciones"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {esEdicion ? (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  iconLeft={<Trash2 className="h-3.5 w-3.5" aria-hidden />}
                  disabled={enviando || eliminando}
                  loading={eliminando}
                  onClick={() => void eliminar()}
                >
                  Eliminar
                </Button>
              ) : null}
              <button
                type="button"
                aria-label="Cerrar"
                className="rounded-xl p-2 text-[color:var(--muted)] hover:bg-[color:var(--surface)] hover:text-[color:var(--text)]"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="shrink-0 border-b border-[color:var(--border)] px-5 py-3">
            <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
              {modo === "semanal" ? (
                <Select
                  label="Día"
                  value={String(diaDeSemana)}
                  onChange={(e) => setDiaDeSemana(Number(e.target.value))}
                >
                  {DIAS_SEMANA.map((d) => (
                    <option key={d.valor} value={d.valor}>
                      {d.etiqueta}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input type="date" label="Fecha" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              )}
              <HoraInicioInput label="Inicio" value={horaInicio} onChange={setHoraInicio} />
              <Input
                type="number"
                min={15}
                step={15}
                label="Duración (min)"
                value={duracionMin}
                onChange={(e) => setDuracionMin(Number(e.target.value))}
              />
              {!esEdicion ? (
                <Select
                  label="Tipo"
                  value={modo}
                  onChange={(e) => setModo(e.target.value as "semanal" | "evento")}
                >
                  <option value="semanal">Semanal</option>
                  <option value="evento">Evento puntual</option>
                </Select>
              ) : (
                <div className="flex flex-col justify-end">
                  <span className="text-xs text-[color:var(--muted)]">Tipo</span>
                  <span className="text-sm font-medium text-[color:var(--text)]">
                    {modo === "semanal" ? "Semanal" : "Evento puntual"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5">
            <SlotWizard
              step={step}
              onBack={step !== "playlist" ? () => setStep(step === "voz" ? "playlist" : "voz") : undefined}
              onNext={
                step !== "interrupciones"
                  ? () => setStep(step === "playlist" ? "voz" : "interrupciones")
                  : () => void guardar()
              }
              nextLabel={step === "interrupciones" ? "Guardar slot" : "Siguiente"}
              nextDisabled={nextDisabled || eliminando}
              loading={enviando}
              className="min-h-0"
            >
              {step === "playlist" ? (
                <div className="space-y-4">
                  {sinSpotify ? (
                    <p className="flex items-start gap-2 text-sm text-[color:var(--warning)]">
                      <SpotifyIcon className="mt-0.5 shrink-0" size="sm" />
                      <span>
                        Conectá Spotify en{" "}
                        <Link href="/spotify" className="font-medium underline">
                          /spotify
                        </Link>
                        .
                      </span>
                    </p>
                  ) : null}
                  <PlaylistPicker
                    playlists={playlists}
                    selectedId={playlistId}
                    onSelect={(id) => {
                      const pl = playlists.find((p) => p.id === id);
                      setPlaylistId(id);
                      setPlaylistNombre(pl?.nombre ?? "");
                    }}
                    loading={cargandoPlaylists}
                    spotifyConnected={!sinSpotify}
                    showSearch
                    showTabs
                    showDetail
                  />
                </div>
              ) : null}

              {step === "voz" ? (
                <div className="space-y-4">
                  {cargandoVoces ? (
                    <p className="text-sm text-[color:var(--muted)]">Cargando voces…</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {voces.map((v) => (
                        <VoiceCard
                          key={v.voz.id}
                          alias={v.voz.nombre}
                          personalidad={v.voz.personalidad ?? undefined}
                          selected={voz1Id === v.voz.id}
                          onSelect={() => setVoz1Id(v.voz.id)}
                          onPreview={() => {}}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {step === "interrupciones" ? (
                <div className="space-y-3">
                  <InterruptionConfigCard
                    tipo="hora"
                    activo={djHoraActiva}
                    onActivoChange={setDjHoraActiva}
                    intervaloMin={djHoraIntervaloMin}
                    onIntervaloChange={setDjHoraIntervaloMin}
                  />
                  <InterruptionConfigCard
                    tipo="clima"
                    activo={djClimaActivo}
                    onActivoChange={setDjClimaActivo}
                    intervaloMin={djClimaIntervaloMin}
                    onIntervaloChange={setDjClimaIntervaloMin}
                  />
                  <InterruptionConfigCard
                    tipo="publicidad"
                    activo={djPublicidadActiva}
                    onActivoChange={setDjPublicidadActiva}
                    intervaloMin={djPublicidadIntervaloMin}
                    onIntervaloChange={setDjPublicidadIntervaloMin}
                  />
                  <InterruptionConfigCard
                    tipo="audio"
                    activo={djAudioActiva}
                    onActivoChange={setDjAudioActiva}
                    intervaloMin={djAudioIntervaloMin}
                    onIntervaloChange={setDjAudioIntervaloMin}
                    carpetasOptions={carpetasOptions}
                    carpetaId={djAudioCarpetaId}
                    onCarpetaIdChange={setDjAudioCarpetaId}
                  />
                  <InterruptionConfigCard
                    tipo="presentacion"
                    activo={presentacionActiva}
                    onActivoChange={setPresentacionActiva}
                    presentacionCadaTemas={presentacionCadaTemas}
                    onPresentacionCadaTemasChange={setPresentacionCadaTemas}
                  />
                  {error ? <p className="text-sm text-[color:var(--danger)]">{error}</p> : null}
                </div>
              ) : null}
            </SlotWizard>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

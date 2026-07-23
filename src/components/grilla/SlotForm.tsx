"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { SpotifyIcon } from "@/components/brand/SpotifyIcon";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  clampDjIntervaloMin,
  DJ_INTERRUPCION_INTERVALO_MAX,
  DJ_INTERRUPCION_INTERVALO_MIN,
} from "@/lib/grilla/djConfigSchema";
import { HoraInicioInput } from "@/components/grilla/HoraInicioInput";
import { usarApiSlotsSemanal } from "@/lib/grilla/slotPersistencia";
import { normalizarHoraHHMM } from "@/lib/grilla/tiempo";
import type { GrillaEditorEventoRow, GrillaEditorSlotRow } from "@/types/grilla";
import type { SpotifyPlaylistRow } from "@/lib/spotify/api";
import { normalizePlaylistId } from "@/lib/spotify/playlistId";
import { cn } from "@/lib/utils";

export type SlotFormTarget =
  | { kind: "nuevo-semanal"; defaults: { diaDeSemana: number; horaInicio: string; duracionMin: number } }
  | { kind: "nuevo-evento"; defaults?: { fecha: string; horaInicio: string; duracionMin: number } }
  | { kind: "editar-slot"; slot: GrillaEditorSlotRow }
  | { kind: "editar-evento"; evento: GrillaEditorEventoRow };

type VozOptionRow = { voz: { id: string; nombre: string } };

function useEnterTransition(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) setReady(true);
        });
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return ready;
}

function playlistInicialDesdeTarget(target: SlotFormTarget): { id: string; nombre: string } {
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

function vozInicialDesdeTarget(target: SlotFormTarget): string {
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
    presentacionCadaTemas: 1,
    djHoraActiva: false,
    djHoraIntervaloMin: 30,
    djClimaActivo: false,
    djClimaIntervaloMin: 30,
    djPublicidadActiva: false,
    djPublicidadIntervaloMin: 30,
    djAudioActiva: false,
    djAudioIntervaloMin: 30,
    djAudioCarpetaId: null,
  };
  if (target.kind === "editar-slot") {
    const s = target.slot;
    return {
      presentacionCadaTemas: s.presentacionCadaTemas,
      djHoraActiva: s.djHoraActiva,
      djHoraIntervaloMin: s.djHoraIntervaloMin ?? 30,
      djClimaActivo: s.djClimaActivo,
      djClimaIntervaloMin: s.djClimaIntervaloMin ?? 30,
      djPublicidadActiva: s.djPublicidadActiva,
      djPublicidadIntervaloMin: s.djPublicidadIntervaloMin ?? 30,
      djAudioActiva: s.djAudioActiva,
      djAudioIntervaloMin: s.djAudioIntervaloMin ?? 30,
      djAudioCarpetaId: s.djAudioCarpetaId,
    };
  }
  if (target.kind === "editar-evento") {
    const e = target.evento;
    return {
      presentacionCadaTemas: e.presentacionCadaTemas,
      djHoraActiva: e.djHoraActiva,
      djHoraIntervaloMin: e.djHoraIntervaloMin ?? 30,
      djClimaActivo: e.djClimaActivo,
      djClimaIntervaloMin: e.djClimaIntervaloMin ?? 30,
      djPublicidadActiva: e.djPublicidadActiva,
      djPublicidadIntervaloMin: e.djPublicidadIntervaloMin ?? 30,
      djAudioActiva: e.djAudioActiva,
      djAudioIntervaloMin: e.djAudioIntervaloMin ?? 30,
      djAudioCarpetaId: e.djAudioCarpetaId,
    };
  }
  return defaults;
}

type CarpetaAudioOptionRow = { id: string; nombre: string; esActiva: boolean; archivosCount: number };

type DjTipoCampoProps = {
  playlistId: string;
  voz1Id: string;
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
  onPlaylistChange: (id: string, nombre: string) => void;
  onVoz1Change: (id: string) => void;
  onPresentacionCadaTemasChange: (n: number) => void;
  onDjHoraActivaChange: (v: boolean) => void;
  onDjHoraIntervaloMinChange: (n: number) => void;
  onDjClimaActivoChange: (v: boolean) => void;
  onDjClimaIntervaloMinChange: (n: number) => void;
  onDjPublicidadActivaChange: (v: boolean) => void;
  onDjPublicidadIntervaloMinChange: (n: number) => void;
  onDjAudioActivaChange: (v: boolean) => void;
  onDjAudioIntervaloMinChange: (n: number) => void;
  onDjAudioCarpetaIdChange: (id: string) => void;
};

function DjTipoCampo({
  playlistId,
  voz1Id,
  presentacionCadaTemas,
  djHoraActiva,
  djHoraIntervaloMin,
  djClimaActivo,
  djClimaIntervaloMin,
  djPublicidadActiva,
  djPublicidadIntervaloMin,
  djAudioActiva,
  djAudioIntervaloMin,
  djAudioCarpetaId,
  onPlaylistChange,
  onVoz1Change,
  onPresentacionCadaTemasChange,
  onDjHoraActivaChange,
  onDjHoraIntervaloMinChange,
  onDjClimaActivoChange,
  onDjClimaIntervaloMinChange,
  onDjPublicidadActivaChange,
  onDjPublicidadIntervaloMinChange,
  onDjAudioActivaChange,
  onDjAudioIntervaloMinChange,
  onDjAudioCarpetaIdChange,
}: DjTipoCampoProps): React.ReactElement {
  const ready = useEnterTransition();
  const [sinSpotify, setSinSpotify] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [playlists, setPlaylists] = useState<SpotifyPlaylistRow[]>([]);
  const [voces, setVoces] = useState<VozOptionRow[]>([]);
  const [cargandoVoces, setCargandoVoces] = useState(true);
  const [publicidadesActivas, setPublicidadesActivas] = useState<number | null>(null);
  const [carpetasAudio, setCarpetasAudio] = useState<CarpetaAudioOptionRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/anunciantes?resumen=1");
      if (cancelled) return;
      if (res.ok) {
        const data = (await res.json()) as { activas?: number };
        setPublicidadesActivas(typeof data.activas === "number" ? data.activas : 0);
      } else {
        setPublicidadesActivas(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setCargandoVoces(true);
      const res = await fetch("/api/voces");
      if (cancelled) return;
      if (res.ok) {
        const data = (await res.json()) as VozOptionRow[];
        setVoces(data);
      }
      setCargandoVoces(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setCargando(true);
      setFetchError(false);
      const res = await fetch("/api/spotify/playlists");
      if (cancelled) return;
      if (res.status === 400 || res.status === 401) {
        setSinSpotify(true);
        setCargando(false);
        return;
      }
      if (!res.ok) {
        setFetchError(true);
        setCargando(false);
        return;
      }
      const data = (await res.json()) as SpotifyPlaylistRow[];
      setPlaylists(data);
      setCargando(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/audios/carpetas");
      if (cancelled) return;
      if (res.ok) setCarpetasAudio((await res.json()) as CarpetaAudioOptionRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const carpetasSeleccionables = carpetasAudio.filter((c) => c.esActiva && c.archivosCount > 0);
  const propiasDisponibles = playlists.some((p) => p.canReadTracksViaApi);

  return (
    <div
      className={cn(
        "space-y-3 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 transition duration-[120ms] ease-out will-change-[opacity,transform]",
        ready ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
      )}
    >
      <p className="flex items-center gap-2 text-sm text-zinc-500">
        <SpotifyIcon size="sm" />
        Modo DJ: playlist, locutor y interrupciones en vivo (hora, clima, publicidad).
      </p>
      {sinSpotify ? (
        <p className="flex items-start gap-2 text-sm text-amber-400">
          <SpotifyIcon className="mt-0.5 shrink-0" size="sm" />
          <span>
            Conectá Spotify primero en{" "}
            <Link href="/spotify" className="font-medium underline hover:text-amber-300">
              /spotify
            </Link>
            .
          </span>
        </p>
      ) : fetchError ? (
        <p className="text-sm text-amber-400">No se pudieron cargar las playlists.</p>
      ) : cargando ? (
        <p className="text-sm text-zinc-500">Cargando playlists…</p>
      ) : !propiasDisponibles ? (
        <p className="text-sm text-amber-400">No tenés playlists disponibles en tu cuenta.</p>
      ) : (
        <Select
          label="Playlist"
          value={playlistId}
          onChange={(ev) => {
            const id = ev.target.value;
            const pl = playlists.find((p) => p.id === id);
            onPlaylistChange(id, pl?.name ?? "");
          }}
        >
          <option value="">Sin playlist</option>
          {playlists.map((p) => (
            <option key={p.id} value={p.id} disabled={!p.canReadTracksViaApi}>
              {p.name}
            </option>
          ))}
        </Select>
      )}
      {cargandoVoces ? (
        <p className="text-sm text-zinc-500">Cargando voces…</p>
      ) : (
        <Select label="Locutor" value={voz1Id} onChange={(ev) => onVoz1Change(ev.target.value)}>
          <option value="">Sin voz IA</option>
          {voces.map((v) => (
            <option key={v.voz.id} value={v.voz.id}>
              {v.voz.nombre}
            </option>
          ))}
        </Select>
      )}
      <Input
        type="number"
        min={1}
        max={20}
        label="Presentación cada cuántos temas"
        value={presentacionCadaTemas}
        onChange={(ev) => onPresentacionCadaTemasChange(Number(ev.target.value))}
      />
      <fieldset className="space-y-2 rounded border border-zinc-800 p-2">
        <legend className="px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Interrupciones en vivo
        </legend>
        <label className="flex flex-col gap-1.5 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          <span className="flex items-center gap-2">
            <input type="checkbox" checked={djHoraActiva} onChange={(ev) => onDjHoraActivaChange(ev.target.checked)} />
            <span>Hora</span>
          </span>
          {djHoraActiva ? (
            <span className="flex items-center gap-2 pl-6 sm:pl-0">
              <Input
                type="number"
                min={DJ_INTERRUPCION_INTERVALO_MIN}
                max={DJ_INTERRUPCION_INTERVALO_MAX}
                className="w-full max-w-[7rem] sm:w-24"
                value={djHoraIntervaloMin}
                onChange={(ev) => onDjHoraIntervaloMinChange(clampDjIntervaloMin(Number(ev.target.value)))}
                aria-label="Intervalo hora en minutos"
              />
              <span className="text-zinc-500">min</span>
            </span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1.5 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          <span className="flex items-center gap-2">
            <input type="checkbox" checked={djClimaActivo} onChange={(ev) => onDjClimaActivoChange(ev.target.checked)} />
            <span>Clima (sin nombrar ciudad)</span>
          </span>
          {djClimaActivo ? (
            <span className="flex items-center gap-2 pl-6 sm:pl-0">
              <Input
                type="number"
                min={DJ_INTERRUPCION_INTERVALO_MIN}
                max={DJ_INTERRUPCION_INTERVALO_MAX}
                className="w-full max-w-[7rem] sm:w-24"
                value={djClimaIntervaloMin}
                onChange={(ev) => onDjClimaIntervaloMinChange(clampDjIntervaloMin(Number(ev.target.value)))}
                aria-label="Intervalo clima en minutos"
              />
              <span className="text-zinc-500">min</span>
            </span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1.5 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={djPublicidadActiva}
              onChange={(ev) => onDjPublicidadActivaChange(ev.target.checked)}
            />
            <span>Publicidad (rotación)</span>
          </span>
          {djPublicidadActiva ? (
            <span className="flex items-center gap-2 pl-6 sm:pl-0">
              <Input
                type="number"
                min={DJ_INTERRUPCION_INTERVALO_MIN}
                max={DJ_INTERRUPCION_INTERVALO_MAX}
                className="w-full max-w-[7rem] sm:w-24"
                value={djPublicidadIntervaloMin}
                onChange={(ev) => onDjPublicidadIntervaloMinChange(clampDjIntervaloMin(Number(ev.target.value)))}
                aria-label="Intervalo publicidad en minutos"
              />
              <span className="text-zinc-500">min</span>
            </span>
          ) : null}
        </label>
        {publicidadesActivas === 0 ? (
          <p className="text-xs text-amber-400">
            No hay publicidades activas con texto en el catálogo.{" "}
            <Link href="/publicidad" className="font-medium underline hover:text-amber-300">
              Crear en Publicidad
            </Link>
          </p>
        ) : publicidadesActivas !== null && djPublicidadActiva ? (
          <p className="text-xs text-zinc-500">
            {publicidadesActivas} publicidad{publicidadesActivas === 1 ? "" : "es"} activa
            {publicidadesActivas === 1 ? "" : "s"} en rotación.
          </p>
        ) : null}
        <label className="flex flex-col gap-1.5 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          <span className="flex items-center gap-2">
            <input type="checkbox" checked={djAudioActiva} onChange={(ev) => onDjAudioActivaChange(ev.target.checked)} />
            <span>Audios (jingles / IDs / cortinas)</span>
          </span>
          {djAudioActiva ? (
            <span className="flex items-center gap-2 pl-6 sm:pl-0">
              <Input
                type="number"
                min={DJ_INTERRUPCION_INTERVALO_MIN}
                max={DJ_INTERRUPCION_INTERVALO_MAX}
                className="w-full max-w-[7rem] sm:w-24"
                value={djAudioIntervaloMin}
                onChange={(ev) => onDjAudioIntervaloMinChange(clampDjIntervaloMin(Number(ev.target.value)))}
                aria-label="Intervalo audios en minutos"
              />
              <span className="text-zinc-500">min</span>
            </span>
          ) : null}
        </label>
        {djAudioActiva ? (
          carpetasSeleccionables.length === 0 ? (
            <p className="text-xs text-amber-400">
              No hay carpetas activas con audios.{" "}
              <Link href="/audios" className="font-medium underline hover:text-amber-300">
                Subir en Audios
              </Link>
              .
            </p>
          ) : (
            <Select
              label="Carpeta de audios"
              value={djAudioCarpetaId ?? ""}
              onChange={(ev) => onDjAudioCarpetaIdChange(ev.target.value)}
            >
              <option value="">Elegí una carpeta</option>
              {carpetasSeleccionables.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.archivosCount})
                </option>
              ))}
            </Select>
          )
        ) : null}
      </fieldset>
    </div>
  );
}

type Modo = "semanal" | "evento";

const DIAS_SEMANA = [
  { valor: 1, etiqueta: "Lunes" },
  { valor: 2, etiqueta: "Martes" },
  { valor: 3, etiqueta: "Miercoles" },
  { valor: 4, etiqueta: "Jueves" },
  { valor: 5, etiqueta: "Viernes" },
  { valor: 6, etiqueta: "Sabado" },
  { valor: 0, etiqueta: "Domingo" },
];

function fechaDbAInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hoyYmdLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function estadoInicialDesdeTarget(target: SlotFormTarget): {
  modo: Modo;
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

type SlotFormProps = {
  target: SlotFormTarget;
  onSuccess: () => Promise<void>;
  onCancel?: () => void;
  className?: string;
};

function buildDjPayload(
  playlistId: string,
  playlistNombre: string,
  voz1Id: string,
  dj: ReturnType<typeof djConfigInicial>,
): Record<string, unknown> {
  return {
    playlistId: playlistId || null,
    playlistNombre: playlistNombre || null,
    voz1Id: voz1Id || null,
    voz2Id: null,
    presentacionCadaTemas: dj.presentacionCadaTemas,
    djHoraActiva: dj.djHoraActiva,
    djHoraIntervaloMin: dj.djHoraActiva ? dj.djHoraIntervaloMin : null,
    djClimaActivo: dj.djClimaActivo,
    djClimaIntervaloMin: dj.djClimaActivo ? dj.djClimaIntervaloMin : null,
    djPublicidadActiva: dj.djPublicidadActiva,
    djPublicidadIntervaloMin: dj.djPublicidadActiva ? dj.djPublicidadIntervaloMin : null,
    djAudioActiva: dj.djAudioActiva,
    djAudioIntervaloMin: dj.djAudioActiva ? dj.djAudioIntervaloMin : null,
    djAudioCarpetaId: dj.djAudioActiva ? dj.djAudioCarpetaId : null,
  };
}

export function SlotForm({ target, onSuccess, onCancel, className }: SlotFormProps): React.ReactElement {
  const ini = estadoInicialDesdeTarget(target);
  const plIni = playlistInicialDesdeTarget(target);
  const vozInicial = vozInicialDesdeTarget(target);
  const djIni = djConfigInicial(target);
  const [modo, setModo] = useState<Modo>(ini.modo);
  const [diaDeSemana, setDiaDeSemana] = useState(ini.diaDeSemana);
  const [fecha, setFecha] = useState(ini.fecha);
  const [horaInicio, setHoraInicio] = useState(ini.horaInicio);
  const [duracionMin, setDuracionMin] = useState(ini.duracionMin);
  const [playlistId, setPlaylistId] = useState(plIni.id);
  const [playlistNombre, setPlaylistNombre] = useState(plIni.nombre);
  const [voz1Id, setVoz1Id] = useState(vozInicial);
  const [presentacionCadaTemas, setPresentacionCadaTemas] = useState(djIni.presentacionCadaTemas);
  const [djHoraActiva, setDjHoraActiva] = useState(djIni.djHoraActiva);
  const [djHoraIntervaloMin, setDjHoraIntervaloMin] = useState(djIni.djHoraIntervaloMin);
  const [djClimaActivo, setDjClimaActivo] = useState(djIni.djClimaActivo);
  const [djClimaIntervaloMin, setDjClimaIntervaloMin] = useState(djIni.djClimaIntervaloMin);
  const [djPublicidadActiva, setDjPublicidadActiva] = useState(djIni.djPublicidadActiva);
  const [djPublicidadIntervaloMin, setDjPublicidadIntervaloMin] = useState(djIni.djPublicidadIntervaloMin);
  const [djAudioActiva, setDjAudioActiva] = useState(djIni.djAudioActiva);
  const [djAudioIntervaloMin, setDjAudioIntervaloMin] = useState(djIni.djAudioIntervaloMin);
  const [djAudioCarpetaId, setDjAudioCarpetaId] = useState(djIni.djAudioCarpetaId);
  const [enviando, setEnviando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esEdicion = target.kind === "editar-slot" || target.kind === "editar-evento";

  const djState = {
    presentacionCadaTemas,
    djHoraActiva,
    djHoraIntervaloMin,
    djClimaActivo,
    djClimaIntervaloMin,
    djPublicidadActiva,
    djPublicidadIntervaloMin,
    djAudioActiva,
    djAudioIntervaloMin,
    djAudioCarpetaId,
  };

  async function eliminar(): Promise<void> {
    if (target.kind !== "editar-slot" && target.kind !== "editar-evento") return;
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
      await onSuccess();
    } finally {
      setEliminando(false);
    }
  }

  async function enviar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const horaNorm = normalizarHoraHHMM(horaInicio);
      if (!horaNorm) {
        setError("Hora de inicio inválida");
        return;
      }
      if (djAudioActiva && !djAudioCarpetaId) {
        setError("Elegí una carpeta de audios para activar la interrupción de Audios");
        return;
      }
      const djPayload = buildDjPayload(playlistId, playlistNombre, voz1Id, djState);
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
          target.kind === "editar-evento"
            ? `/api/grilla/eventos/${target.evento.id}`
            : "/api/grilla/eventos";
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
      await onSuccess();
    } finally {
      setEnviando(false);
    }
  }

  const titulo =
    target.kind === "nuevo-semanal"
      ? "Nuevo slot semanal"
      : target.kind === "nuevo-evento"
        ? "Nuevo evento puntual"
        : target.kind === "editar-slot"
          ? "Editar slot"
          : "Editar evento";

  return (
    <form onSubmit={(ev) => void enviar(ev)} className={cn("space-y-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-medium text-zinc-100">{titulo}</h3>
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 px-2 text-zinc-500 hover:text-zinc-300"
            onClick={() => onCancel()}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
      </div>
      {!esEdicion ? (
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="modo"
              checked={modo === "semanal"}
              onChange={() => setModo("semanal")}
            />
            Repetir cada semana
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="modo"
              checked={modo === "evento"}
              onChange={() => setModo("evento")}
            />
            Una sola vez (fecha específica)
          </label>
        </div>
      ) : null}
      {modo === "semanal" ? (
        <Select label="Dia" value={String(diaDeSemana)} onChange={(ev) => setDiaDeSemana(Number(ev.target.value))}>
          {DIAS_SEMANA.map((d) => (
            <option key={d.valor} value={d.valor}>
              {d.etiqueta}
            </option>
          ))}
        </Select>
      ) : (
        <Input type="date" label="Fecha" value={fecha} onChange={(ev) => setFecha(ev.target.value)} />
      )}
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <HoraInicioInput label="Hora inicio" value={horaInicio} onChange={setHoraInicio} />
        <Input
          type="number"
          min={5}
          step={5}
          label="Duracion (min)"
          value={duracionMin}
          onChange={(ev) => setDuracionMin(Number(ev.target.value))}
          required
        />
      </div>
      <DjTipoCampo
        playlistId={playlistId}
        voz1Id={voz1Id}
        presentacionCadaTemas={presentacionCadaTemas}
        djHoraActiva={djHoraActiva}
        djHoraIntervaloMin={djHoraIntervaloMin}
        djClimaActivo={djClimaActivo}
        djClimaIntervaloMin={djClimaIntervaloMin}
        djPublicidadActiva={djPublicidadActiva}
        djPublicidadIntervaloMin={djPublicidadIntervaloMin}
        djAudioActiva={djAudioActiva}
        djAudioIntervaloMin={djAudioIntervaloMin}
        djAudioCarpetaId={djAudioCarpetaId}
        onPlaylistChange={(id, nombre) => {
          setPlaylistId(id);
          setPlaylistNombre(nombre);
        }}
        onVoz1Change={setVoz1Id}
        onPresentacionCadaTemasChange={setPresentacionCadaTemas}
        onDjHoraActivaChange={setDjHoraActiva}
        onDjHoraIntervaloMinChange={setDjHoraIntervaloMin}
        onDjClimaActivoChange={setDjClimaActivo}
        onDjClimaIntervaloMinChange={setDjClimaIntervaloMin}
        onDjPublicidadActivaChange={setDjPublicidadActiva}
        onDjPublicidadIntervaloMinChange={setDjPublicidadIntervaloMin}
        onDjAudioActivaChange={setDjAudioActiva}
        onDjAudioIntervaloMinChange={setDjAudioIntervaloMin}
        onDjAudioCarpetaIdChange={setDjAudioCarpetaId}
      />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" disabled={enviando || eliminando}>
          {enviando ? "Guardando..." : "Guardar"}
        </Button>
        {esEdicion ? (
          <Button
            type="button"
            variant="danger"
            disabled={enviando || eliminando}
            onClick={() => void eliminar()}
          >
            {eliminando ? "Eliminando..." : "Eliminar"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

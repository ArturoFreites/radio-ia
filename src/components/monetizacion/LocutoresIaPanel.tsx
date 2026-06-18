"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { GeneroVoz, TonoVoz } from "@prisma/client";
import { Mic2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { FilterPills } from "@/components/monetizacion/FilterPills";
import { LocutorRow, type LocutorRowData } from "@/components/monetizacion/LocutorRow";
import { MonetizacionColumnShell } from "@/components/monetizacion/MonetizacionColumnShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

type ElevenLabsVozItem = {
  voice_id: string;
  name: string;
  preview_url: string | null;
  labels: Record<string, string>;
};

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

type LocutoresIaPanelProps = {
  initialVoces: VozItem[];
  onLocutorSelect?: (locutor: LocutorRowData) => void;
  selectedLocutorId?: string | null;
  /** En vista dedicada muestra la lista completa sin límite de preview. */
  compact?: boolean;
};

type FiltroLocutor = "todos" | "ia" | "staff" | "favoritos";

type FormState = {
  nombre: string;
  eventlabsVoiceId: string;
  descripcion: string;
  genero: GeneroVoz;
  tono: TonoVoz;
  nombreAlAire: string;
  personalidad: string;
};

const INITIAL_FORM: FormState = {
  nombre: "",
  eventlabsVoiceId: "",
  descripcion: "",
  genero: GeneroVoz.NEUTRA,
  tono: TonoVoz.AMIGABLE,
  nombreAlAire: "",
  personalidad: "",
};

const FILTROS: Array<{ id: FiltroLocutor; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "ia", label: "IA Voices" },
  { id: "staff", label: "Staff" },
  { id: "favoritos", label: "Favoritos" },
];

const PREVIEW_LIMIT = 5;

function toLocutorRow(item: VozItem): LocutorRowData {
  return {
    id: item.voz.id,
    geminiVoiceId: item.voz.geminiVoiceId,
    alias: item.alias ?? item.voz.nombre,
    nombreAlAire: item.nombreAlAire,
    personalidad: item.personalidad,
    genero: item.voz.genero,
    tono: item.voz.tono,
    idioma: item.voz.idioma,
    previewUrl: item.voz.previewUrl,
  };
}

function opcionVozLabel(voz: ElevenLabsVozItem): string {
  const partes: string[] = [];
  if (voz.labels.gender) partes.push(voz.labels.gender);
  if (voz.labels.accent) partes.push(voz.labels.accent);
  const etiquetas = partes.join(" · ");
  return etiquetas ? `${voz.name} (${etiquetas})` : voz.name;
}

export function LocutoresIaPanel({
  initialVoces,
  onLocutorSelect,
  selectedLocutorId,
  compact = true,
}: LocutoresIaPanelProps): React.ReactElement {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [voces, setVoces] = useState<VozItem[]>(initialVoces);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroLocutor>("todos");
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [formAbierto, setFormAbierto] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [editingVozId, setEditingVozId] = useState<string | null>(null);
  const [elevenLabsVoces, setElevenLabsVoces] = useState<ElevenLabsVozItem[]>([]);
  const [elevenLabsLoading, setElevenLabsLoading] = useState(true);
  const [elevenLabsFallback, setElevenLabsFallback] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(selectedLocutorId ?? null);

  useEffect(() => {
    let cancelled = false;
    const loadElevenLabsVoces = async (): Promise<void> => {
      setElevenLabsLoading(true);
      setElevenLabsFallback(false);
      try {
        const response = await fetch("/api/voces/elevenlabs", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setElevenLabsFallback(true);
          return;
        }
        const payload = (await response.json()) as { voces?: ElevenLabsVozItem[] };
        if (!cancelled) {
          setElevenLabsVoces(payload.voces ?? []);
        }
      } catch {
        if (!cancelled) setElevenLabsFallback(true);
      } finally {
        if (!cancelled) setElevenLabsLoading(false);
      }
    };
    void loadElevenLabsVoces();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const vozElevenLabsSeleccionada = useMemo(
    () => elevenLabsVoces.find((voz) => voz.voice_id === form.eventlabsVoiceId),
    [elevenLabsVoces, form.eventlabsVoiceId],
  );

  const locutores = useMemo(() => {
    const rows = voces.map(toLocutorRow);
    const query = busqueda.trim().toLowerCase();

    return rows.filter((row) => {
      if (filtro === "staff" && !row.nombreAlAire && !row.personalidad) return false;
      if (filtro === "favoritos" && row.tono !== TonoVoz.ENERGETICO) return false;
      if (!query) return true;
      const haystack = [row.alias, row.nombreAlAire, row.personalidad]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [voces, busqueda, filtro]);

  const visibles = compact
    ? mostrarTodos
      ? locutores
      : locutores.slice(0, PREVIEW_LIMIT)
    : locutores;

  const reproducirPreview = (row: LocutorRowData, previewFromCatalog?: string | null): void => {
    const previewUrl = previewFromCatalog ?? row.previewUrl;
    if (!previewUrl) {
      toast.error("Esta voz no tiene preview disponible");
      return;
    }

    if (playingId === row.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    audioRef.current?.pause();
    const audio = new Audio(previewUrl);
    audioRef.current = audio;
    setPlayingId(row.id);
    void audio.play().catch(() => {
      toast.error("No se pudo reproducir el preview");
      setPlayingId(null);
    });
    audio.onended = () => setPlayingId(null);
  };

  const onElevenLabsVoiceChange = (voiceId: string): void => {
    const voz = elevenLabsVoces.find((item) => item.voice_id === voiceId);
    setForm((prev) => ({
      ...prev,
      eventlabsVoiceId: voiceId,
      nombre: prev.nombre.trim() === "" && voz ? voz.name : prev.nombre,
    }));
  };

  const cancelEdit = (): void => {
    setEditingVozId(null);
    setForm(INITIAL_FORM);
    setFormAbierto(false);
  };

  const startEdit = (vozId: string): void => {
    const item = voces.find((entry) => entry.voz.id === vozId);
    if (!item) return;
    setForm({
      nombre: item.voz.nombre,
      eventlabsVoiceId: item.voz.geminiVoiceId,
      descripcion: item.voz.descripcion,
      genero: item.voz.genero,
      tono: item.voz.tono,
      nombreAlAire: item.nombreAlAire ?? "",
      personalidad: item.personalidad ?? "",
    });
    setEditingVozId(vozId);
    setFormAbierto(true);
  };

  const guardar = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!form.nombre.trim() || !form.eventlabsVoiceId.trim()) {
      toast.error("Nombre y voice ID son obligatorios");
      return;
    }

    setIsSaving(true);
    try {
      if (editingVozId) {
        const response = await fetch(`/api/voces/${editingVozId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: form.nombre.trim(),
            eventlabsVoiceId: form.eventlabsVoiceId.trim(),
            descripcion: form.descripcion.trim(),
            genero: form.genero,
            tono: form.tono,
            nombreAlAire: form.nombreAlAire.trim() || null,
            personalidad: form.personalidad.trim() || null,
          }),
        });
        if (!response.ok) {
          throw new Error("No se pudo actualizar la voz");
        }
        const payload = (await response.json()) as { voz?: VozItem };
        const updated = payload.voz;
        setVoces((prev) =>
          prev.map((item) =>
            item.voz.id === editingVozId
              ? updated ?? {
                  ...item,
                  nombreAlAire: form.nombreAlAire.trim() || null,
                  personalidad: form.personalidad.trim() || null,
                  voz: {
                    ...item.voz,
                    nombre: form.nombre.trim(),
                    geminiVoiceId: form.eventlabsVoiceId.trim(),
                    descripcion: form.descripcion.trim(),
                    genero: form.genero,
                    tono: form.tono,
                  },
                }
              : item,
          ),
        );
        cancelEdit();
        toast.success("Locutor actualizado");
      } else {
        const response = await fetch("/api/voces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: form.nombre.trim(),
            eventlabsVoiceId: form.eventlabsVoiceId.trim(),
            descripcion: form.descripcion.trim() || undefined,
            genero: form.genero,
            tono: form.tono,
            nombreAlAire: form.nombreAlAire.trim() || undefined,
            personalidad: form.personalidad.trim() || undefined,
          }),
        });
        if (!response.ok) {
          throw new Error("No se pudo guardar la voz");
        }
        const payload = (await response.json()) as { voz?: VozItem };
        const createdVoice = payload.voz;
        if (createdVoice) {
          setVoces((prev) => {
            const next = prev.filter((item) => item.voz.id !== createdVoice.voz.id);
            next.push(createdVoice);
            return next;
          });
        }
        cancelEdit();
        toast.success("Locutor agregado");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const eliminar = async (vozId: string): Promise<void> => {
    const item = voces.find((entry) => entry.voz.id === vozId);
    if (!item || !window.confirm(`¿Eliminar "${item.voz.nombre}"?`)) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/voces/${vozId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("No se pudo eliminar");
      }
      setVoces((prev) => prev.filter((entry) => entry.voz.id !== vozId));
      if (selectedId === vozId) setSelectedId(null);
      toast.success("Locutor eliminado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar");
    } finally {
      setIsSaving(false);
    }
  };

  const seleccionar = (row: LocutorRowData): void => {
    setSelectedId(row.id);
    onLocutorSelect?.(row);
  };

  return (
    <MonetizacionColumnShell
      icon={<Mic2 className="h-5 w-5" />}
      iconClassName="bg-[color:var(--purple)]/15 text-[color:var(--purple)]"
      title="Locutores IA"
      description="Elegí la voz que representará tu radio en cada programa."
      searchPlaceholder="Buscar locutores…"
      searchValue={busqueda}
      onSearchChange={setBusqueda}
      actionLabel="+ Nuevo locutor"
      onAction={() => {
        setForm(INITIAL_FORM);
        setEditingVozId(null);
        setFormAbierto((prev) => !prev);
      }}
      filters={
        <FilterPills options={FILTROS} value={filtro} onChange={setFiltro} />
      }
      footer={
        compact && locutores.length > PREVIEW_LIMIT ? (
          <button
            type="button"
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] py-2.5 text-sm font-medium text-[color:var(--muted)] transition hover:text-[color:var(--text)]"
            onClick={() => setMostrarTodos((prev) => !prev)}
          >
            {mostrarTodos ? "Mostrar menos" : "Ver todos los locutores"}
          </button>
        ) : null
      }
      className="h-full min-h-[520px]"
    >
      {formAbierto ? (
        <form
          className="mb-3 space-y-2 rounded-xl border border-[color:var(--primary)]/30 bg-[color:var(--surface-soft)] p-3"
          onSubmit={guardar}
        >
          <Input
            placeholder="Nombre de voz"
            value={form.nombre}
            onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
          />
          {elevenLabsFallback ? (
            <Input
              placeholder="ElevenLabs voice ID"
              value={form.eventlabsVoiceId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, eventlabsVoiceId: event.target.value }))
              }
            />
          ) : (
            <div className="flex gap-2">
              <Select
                className="min-w-0 flex-1"
                label="Voz ElevenLabs"
                value={form.eventlabsVoiceId}
                onChange={(event) => onElevenLabsVoiceChange(event.target.value)}
                disabled={elevenLabsLoading}
              >
                <option value="">
                  {elevenLabsLoading ? "Cargando…" : "Elegir voz…"}
                </option>
                {elevenLabsVoces.map((voz) => (
                  <option key={voz.voice_id} value={voz.voice_id}>
                    {opcionVozLabel(voz)}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant="secondary"
                className="mt-6 shrink-0"
                disabled={!vozElevenLabsSeleccionada?.preview_url}
                onClick={() => {
                  const url = vozElevenLabsSeleccionada?.preview_url;
                  if (!url) return;
                  const audio = new Audio(url);
                  void audio.play();
                }}
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Input
            placeholder="Nombre al aire (ej: Laura)"
            value={form.nombreAlAire}
            onChange={(event) => setForm((prev) => ({ ...prev, nombreAlAire: event.target.value }))}
          />
          <Textarea
            placeholder="Personalidad del locutor"
            value={form.personalidad}
            onChange={(event) => setForm((prev) => ({ ...prev, personalidad: event.target.value }))}
            rows={2}
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isSaving} className="flex-1">
              {isSaving ? "Guardando…" : editingVozId ? "Guardar" : "Agregar"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}

      <div className="space-y-2">
        {visibles.length === 0 ? (
          <p className="py-8 text-center text-sm text-[color:var(--muted)]">
            No hay locutores. Creá el primero con &quot;+ Nuevo locutor&quot;.
          </p>
        ) : (
          visibles.map((row) => {
            const catalogPreview = elevenLabsVoces.find(
              (v) =>
                voces.find((item) => item.voz.id === row.id)?.voz.geminiVoiceId === v.voice_id,
            )?.preview_url;

            return (
              <LocutorRow
                key={row.id}
                locutor={row}
                selected={selectedId === row.id}
                playing={playingId === row.id}
                onSelect={() => seleccionar(row)}
                onPlay={() => reproducirPreview(row, catalogPreview ?? row.previewUrl)}
                onMenu={() => startEdit(row.id)}
              />
            );
          })
        )}
      </div>

      {editingVozId && formAbierto ? (
        <div className="mt-2">
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={isSaving}
            onClick={() => void eliminar(editingVozId)}
          >
            Eliminar locutor
          </Button>
        </div>
      ) : null}
    </MonetizacionColumnShell>
  );
}

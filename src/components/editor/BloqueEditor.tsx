"use client";

import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TipoBloque } from "@prisma/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { BloqueCard, type BloqueEditorItem } from "@/components/editor/BloqueCard";
import { pollBloquePreviewGeneracion } from "@/components/editor/pollBloquePreview";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { VozSelectorLocal } from "@/components/voces/VozSelectorLocal";

type TipoSeccionCrear = Extract<TipoBloque, "APERTURA" | "NOTICIA" | "PUBLICIDAD" | "CIERRE" | "CUNA">;

type PublicidadOption = {
  id: string;
  nombre: string;
  duracion: number | null;
};

const defaultConfig = {
  APERTURA: { nombrePrograma: "", horario: "mañana", duracionObjetivo: 30 },
  NOTICIA: { urlNoticia: "", duracionObjetivo: 60, estiloConversacion: "profesional" },
  PUBLICIDAD: { nombreAnunciante: "", urlAnunciante: "", duracionObjetivo: 20 },
  CIERRE: { nombrePrograma: "", mensajeDespedida: "" },
} as const;

type NoticiaRssHeadline = {
  titulo: string;
  resumen: string;
  url: string;
  fecha: string;
  fuente: string;
};

const tituloPorTipo: Record<Exclude<TipoSeccionCrear, "CUNA">, string> = {
  APERTURA: "Apertura",
  NOTICIA: "Noticia",
  PUBLICIDAD: "Publicidad",
  CIERRE: "Cierre",
};

function formatDuracionTotal(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function mapApiBloque(b: {
  id: string;
  titulo: string;
  tipo: TipoBloque;
  orden: number;
  vozId: string | null;
  config: unknown;
  estado: string;
  elevenlabsVoiceId: string | null;
  elevenlabsVoiceId2: string | null;
  guion: string | null;
  audioUrl: string | null;
  duracion: number | null;
}): BloqueEditorItem {
  return {
    id: b.id,
    titulo: b.titulo,
    tipo: b.tipo,
    orden: b.orden,
    vozId: b.vozId,
    config: (typeof b.config === "object" && b.config !== null ? b.config : {}) as Record<string, unknown>,
    estado: b.estado,
    elevenlabsVoiceId: b.elevenlabsVoiceId,
    elevenlabsVoiceId2: b.elevenlabsVoiceId2,
    guion: b.guion,
    audioUrl: b.audioUrl,
    duracion: b.duracion,
  };
}

export function BloqueEditor({
  programaId,
  programaNombre,
  tieneFuentesRss,
  elevenlabsDisponible,
  initialBloques,
  initialVozPorDefectoGeminiId,
  initialProgramaEstado,
}: {
  programaId: string;
  programaNombre: string;
  tieneFuentesRss: boolean;
  elevenlabsDisponible: boolean;
  initialBloques: BloqueEditorItem[];
  initialVozPorDefectoGeminiId: string | null;
  initialProgramaEstado: string;
}): React.ReactElement {
  const [bloques, setBloques] = useState(initialBloques);
  const [programaEstado, setProgramaEstado] = useState(initialProgramaEstado);
  const [generandoPrograma, setGenerandoPrograma] = useState(false);
  const [vozProgramaGeminiId, setVozProgramaGeminiId] = useState<string | null>(initialVozPorDefectoGeminiId);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingVozPrograma, setIsSavingVozPrograma] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adding, setAdding] = useState<TipoSeccionCrear | null>(null);
  const [publicidadPickerOpen, setPublicidadPickerOpen] = useState(false);
  const [publicidades, setPublicidades] = useState<PublicidadOption[]>([]);
  const [publicidadesLoading, setPublicidadesLoading] = useState(false);
  const [rssAbierto, setRssAbierto] = useState(false);
  const [rssCargando, setRssCargando] = useState(false);
  const [rssItems, setRssItems] = useState<NoticiaRssHeadline[]>([]);
  const [rssCargado, setRssCargado] = useState(false);
  const [noticiaRapidaEnCurso, setNoticiaRapidaEnCurso] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const pollProgramaEstado = useCallback(async (): Promise<void> => {
    const res = await fetch(`/api/programas/${programaId}/estado`, { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as {
      estado: string;
      bloques: Array<{
        id: string;
        titulo: string;
        tipo: TipoBloque;
        estado: string;
        duracion: number | null;
        audioUrl: string | null;
      }>;
    };
    if (!mounted.current) return;
    setProgramaEstado(payload.estado);
    setBloques((prev) =>
      prev.map((bloque) => {
        const remoto = payload.bloques.find((b) => b.id === bloque.id);
        if (!remoto) return bloque;
        return {
          ...bloque,
          titulo: remoto.titulo,
          tipo: remoto.tipo,
          estado: remoto.estado,
          duracion: remoto.duracion,
          audioUrl: remoto.audioUrl,
        };
      }),
    );
  }, [programaId]);

  useEffect(() => {
    if (programaEstado !== "GENERANDO") return;
    void pollProgramaEstado();
    const id = window.setInterval(() => void pollProgramaEstado(), 3_000);
    return () => window.clearInterval(id);
  }, [programaEstado, pollProgramaEstado]);

  const bloquesListos = useMemo(
    () => bloques.filter((b) => b.estado === "LISTO").length,
    [bloques],
  );

  const generarPrograma = async (): Promise<void> => {
    if (generandoPrograma || programaEstado === "GENERANDO") return;
    if (bloques.length === 0) {
      toast.error("Agregá al menos una sección antes de generar");
      return;
    }
    setGenerandoPrograma(true);
    try {
      const res = await fetch(`/api/programas/${programaId}/generar`, { method: "POST" });
      if (!res.ok) {
        toast.error("No se pudo iniciar la generación");
        return;
      }
      setProgramaEstado("GENERANDO");
      toast.message("Generación iniciada", { description: "El progreso se actualiza automáticamente" });
    } finally {
      setGenerandoPrograma(false);
    }
  };

  const duracionTotal = useMemo(
    () => bloques.reduce((sum, bloque) => (bloque.duracion != null ? sum + bloque.duracion : sum), 0),
    [bloques],
  );

  const duracionAlerta =
    duracionTotal > 1800 ? "rojo" : duracionTotal > 900 ? "amarillo" : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = bloques.findIndex((b) => b.id === active.id);
    const newIndex = bloques.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setBloques(arrayMove(bloques, oldIndex, newIndex).map((b, idx) => ({ ...b, orden: idx })));
  };

  const saveTimeline = async (): Promise<void> => {
    if (isSaving) return;
    setIsSaving(true);
    const res = await fetch(`/api/programas/${programaId}/bloques`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bloques: bloques.map((bloque, idx) => ({ id: bloque.id, orden: idx })),
      }),
    });
    setIsSaving(false);
    if (!res.ok) {
      toast.error("No se pudo guardar el timeline");
      return;
    }
    const payload = (await res.json().catch(() => null)) as { todosListos?: boolean } | null;
    toast.success("Timeline guardado", {
      description: payload?.todosListos ? "Programa listo para emitir" : undefined,
    });
  };

  const onUpdate = useCallback((bloqueId: string, patch: Partial<BloqueEditorItem>) => {
    setBloques((prev) =>
      prev.map((b) => {
        if (b.id !== bloqueId) return b;
        return { ...b, ...patch };
      }),
    );
  }, []);

  const onDelete = useCallback((bloqueId: string) => {
    setBloques((prev) => prev.filter((b) => b.id !== bloqueId));
    setExpandedId((cur) => (cur === bloqueId ? null : cur));
  }, []);

  const saveVozPrograma = async (geminiVoiceId: string): Promise<void> => {
    if (isSavingVozPrograma) return;
    setIsSavingVozPrograma(true);
    try {
      const vocesRes = await fetch("/api/voces", { cache: "no-store" });
      if (!vocesRes.ok) {
        toast.error("No se pudo cargar el catálogo de voces");
        return;
      }
      const vocesRaw = (await vocesRes.json()) as Array<{ vozId?: string; voz?: { geminiVoiceId: string } }>;
      const match = vocesRaw.find((row) => row.voz?.geminiVoiceId === geminiVoiceId);
      if (!match?.vozId) {
        toast.error("Voz no encontrada en esta radio");
        return;
      }
      const res = await fetch(`/api/programas/${programaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vozPorDefectoId: match.vozId }),
      });
      if (!res.ok) {
        toast.error("No se pudo guardar la voz del programa");
        return;
      }
      setVozProgramaGeminiId(geminiVoiceId);
      toast.success("Voz del programa guardada");
    } finally {
      setIsSavingVozPrograma(false);
    }
  };

  const agregarSeccion = async (tipo: Exclude<TipoSeccionCrear, "CUNA">): Promise<void> => {
    setAdding(tipo);
    try {
      const configSnapshot =
        tipo === "APERTURA"
          ? { ...defaultConfig.APERTURA, nombrePrograma: programaNombre }
          : tipo === "NOTICIA"
            ? { ...defaultConfig.NOTICIA }
            : tipo === "PUBLICIDAD"
              ? { ...defaultConfig.PUBLICIDAD }
              : { ...defaultConfig.CIERRE, nombrePrograma: programaNombre };

      const res = await fetch(`/api/programas/${programaId}/bloques`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: tituloPorTipo[tipo],
          tipo,
          orden: bloques.length,
          config: configSnapshot,
          ...(vozProgramaGeminiId ? { elevenlabsVoiceId: vozProgramaGeminiId } : {}),
        }),
      });
      type CreatedBloque = Parameters<typeof mapApiBloque>[0];
      const payload = (await res.json().catch(() => null)) as { bloques?: CreatedBloque[] } | null;
      if (!res.ok || !payload?.bloques?.[0]) {
        toast.error("No se pudo crear la sección");
        return;
      }
      const created = mapApiBloque(payload.bloques[0]);
      setBloques((prev) => [...prev, created]);
      setExpandedId(created.id);
      toast.success("Sección agregada");
    } finally {
      setAdding(null);
    }
  };

  const abrirSelectorPublicidad = async (): Promise<void> => {
    setPublicidadPickerOpen(true);
    if (publicidades.length > 0 || publicidadesLoading) return;
    setPublicidadesLoading(true);
    try {
      const res = await fetch("/api/anunciantes?conAudio=1", { cache: "no-store" });
      if (!res.ok) {
        toast.error("No se pudo cargar el catálogo de publicidad");
        setPublicidadPickerOpen(false);
        return;
      }
      const payload = (await res.json()) as { publicidades?: PublicidadOption[] };
      setPublicidades(payload.publicidades ?? []);
    } finally {
      setPublicidadesLoading(false);
    }
  };

  const abrirNoticiaRapida = async (): Promise<void> => {
    setRssAbierto(true);
    if (rssCargado || rssCargando) return;
    setRssCargando(true);
    try {
      const res = await fetch("/api/noticias/rss", { cache: "no-store" });
      if (!res.ok) {
        toast.error("No se pudieron cargar los titulares");
        setRssAbierto(false);
        return;
      }
      const payload = (await res.json()) as { noticias?: NoticiaRssHeadline[] };
      setRssItems(payload.noticias ?? []);
      setRssCargado(true);
    } finally {
      setRssCargando(false);
    }
  };

  const elegirNoticiaRapida = async (item: NoticiaRssHeadline): Promise<void> => {
    if (noticiaRapidaEnCurso) return;
    setNoticiaRapidaEnCurso(true);
    setRssAbierto(false);
    try {
      const res = await fetch(`/api/programas/${programaId}/noticias/desde-rss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: item.url, titulo: item.titulo }),
      });
      const payload = (await res.json().catch(() => null)) as { bloque?: Parameters<typeof mapApiBloque>[0]; error?: string } | null;
      if (!res.ok || !payload?.bloque) {
        const msg =
          typeof payload?.error === "string"
            ? payload.error
            : res.status === 422
              ? "No se pudo extraer contenido de la noticia"
              : "No se pudo crear la noticia rápida";
        toast.error(msg);
        return;
      }
      const created = mapApiBloque(payload.bloque);
      setBloques((prev) => [...prev, created]);
      toast.success(
        created.estado === "GENERANDO_GUION" ? "Noticia en generación" : "Noticia creada — configurá las voces",
      );
      if (created.estado === "GENERANDO_GUION") {
        toast.message("Generando preview…", { description: "Puede tardar hasta unos minutos" });
        const result = await pollBloquePreviewGeneracion({
          bloqueId: created.id,
          onUpdate: (patch) => onUpdate(created.id, patch),
          isActive: () => mounted.current,
          fallbackConfig: created.config,
        });
        if (!mounted.current) return;
        if (result === "listo") toast.success("Preview listo");
        else if (result === "error") toast.error("Error al generar preview");
        else if (result === "timeout") toast.error("Tiempo de espera agotado");
      }
    } finally {
      setNoticiaRapidaEnCurso(false);
    }
  };

  const agregarPublicidad = async (publicidad: PublicidadOption): Promise<void> => {
    setAdding("CUNA");
    setPublicidadPickerOpen(false);
    try {
      const res = await fetch(`/api/programas/${programaId}/bloques`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: publicidad.nombre,
          tipo: "CUNA",
          orden: bloques.length,
          config: {
            publicidadId: publicidad.id,
            publicidadNombre: publicidad.nombre,
          },
        }),
      });
      type CreatedBloque = Parameters<typeof mapApiBloque>[0];
      const payload = (await res.json().catch(() => null)) as { bloques?: CreatedBloque[] } | null;
      if (!res.ok || !payload?.bloques?.[0]) {
        toast.error("No se pudo agregar la publicidad");
        return;
      }
      const created = mapApiBloque(payload.bloques[0]);
      setBloques((prev) => [...prev, created]);
      setExpandedId(created.id);
      toast.success("Publicidad agregada");
    } finally {
      setAdding(null);
    }
  };

  return (
    <Card className="rounded-[var(--r-xl)]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-semibold text-zinc-100">Secciones del programa</h3>
          {duracionTotal > 0 ? (
            <div
              className={`rounded-md border px-2 py-1 text-xs tabular-nums ${
                duracionAlerta === "rojo"
                  ? "border-red-800 bg-red-950/60 text-red-200"
                  : duracionAlerta === "amarillo"
                    ? "border-amber-800 bg-amber-950/60 text-amber-200"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300"
              }`}
            >
              <span className="font-medium">Duración total: {formatDuracionTotal(duracionTotal)}</span>
              {duracionAlerta === "amarillo" ? (
                <span className="ml-2 text-amber-300">Superás los 15 min</span>
              ) : null}
              {duracionAlerta === "rojo" ? <span className="ml-2 text-red-300">Superás los 30 min</span> : null}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] max-w-xs flex-1">
            <VozSelectorLocal
              label="Voz del programa"
              value={vozProgramaGeminiId}
              onChange={(id) => void saveVozPrograma(id)}
              disabled={isSavingVozPrograma}
            />
          </div>
          <Button type="button" onClick={() => void saveTimeline()} disabled={isSaving} size="sm">
            {isSaving ? "Guardando…" : "Guardar timeline"}
          </Button>
          <Button
            type="button"
            onClick={() => void generarPrograma()}
            disabled={generandoPrograma || programaEstado === "GENERANDO" || bloques.length === 0}
            size="sm"
          >
            {programaEstado === "GENERANDO" ? "Generando…" : "Generar programa"}
          </Button>
        </div>
      </div>

      {programaEstado === "GENERANDO" ? (
        <div className="mb-4 rounded-lg border border-amber-800/60 bg-amber-950/30 p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-amber-200">
            <span className="font-medium">Generación en curso</span>
            <span className="tabular-nums">
              {bloquesListos} de {bloques.length} bloques completados
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-amber-500 transition-[width] duration-500"
              style={{
                width: bloques.length > 0 ? `${Math.round((bloquesListos / bloques.length) * 100)}%` : "0%",
              }}
            />
          </div>
        </div>
      ) : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={bloques.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <ul className="mb-4 flex list-none flex-col gap-2 p-0">
            {bloques.map((bloque) => (
              <li key={bloque.id}>
                <BloqueCard
                  bloque={bloque}
                  expanded={expandedId === bloque.id}
                  tieneFuentesRss={tieneFuentesRss}
                  elevenlabsDisponible={elevenlabsDisponible}
                  onExpand={(id) => setExpandedId(id)}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                />
              </li>
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {rssAbierto && tieneFuentesRss ? (
        <div className="mb-4 rounded-lg border border-emerald-800 bg-emerald-950/30 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-emerald-100">Elegir titular del feed</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRssAbierto(false)}
              disabled={noticiaRapidaEnCurso}
            >
              Cancelar
            </Button>
          </div>
          {rssCargando ? (
            <p className="text-xs text-zinc-400">Cargando titulares…</p>
          ) : rssItems.length === 0 ? (
            <p className="text-xs text-zinc-400">Sin titulares disponibles.</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto p-0">
              {rssItems.map((item) => (
                <li key={item.url}>
                  <button
                    type="button"
                    className="w-full rounded border border-emerald-900/60 px-2 py-2 text-left text-xs hover:bg-emerald-900/40 disabled:opacity-50"
                    disabled={noticiaRapidaEnCurso}
                    onClick={() => void elegirNoticiaRapida(item)}
                  >
                    <span className="block font-medium text-emerald-100">{item.titulo}</span>
                    <span className="text-[10px] text-zinc-500">
                      {item.fuente} · {new Date(item.fecha).toLocaleString("es-AR")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {publicidadPickerOpen ? (
        <div className="mb-4 rounded-lg border border-violet-800 bg-violet-950/30 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-violet-100">Elegir publicidad</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPublicidadPickerOpen(false)}>
              Cancelar
            </Button>
          </div>
          {publicidadesLoading ? (
            <p className="text-xs text-zinc-400">Cargando publicidades…</p>
          ) : publicidades.length === 0 ? (
            <p className="text-xs text-zinc-400">No hay publicidades con audio pregrabado.</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto p-0">
              {publicidades.map((publicidad) => (
                <li key={publicidad.id}>
                  <button
                    type="button"
                    className="w-full rounded border border-violet-900/60 px-2 py-2 text-left text-xs text-violet-50 hover:bg-violet-900/40 disabled:opacity-50"
                    disabled={adding === "CUNA"}
                    onClick={() => void agregarPublicidad(publicidad)}
                  >
                    <span className="font-medium">{publicidad.nombre}</span>
                    {publicidad.duracion != null ? (
                      <span className="ml-2 text-violet-400/80">{publicidad.duracion}s</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-zinc-800 pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-sky-100 hover:bg-sky-900/40"
          onClick={() => void agregarSeccion("APERTURA")}
          disabled={adding !== null}
        >
          {adding === "APERTURA" ? "Creando…" : "+ Apertura"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-emerald-100 hover:bg-emerald-900/40"
          onClick={() => void agregarSeccion("NOTICIA")}
          disabled={adding !== null || noticiaRapidaEnCurso}
        >
          {adding === "NOTICIA" ? "Creando…" : "+ Noticia"}
        </Button>
        {tieneFuentesRss ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-emerald-200 hover:bg-emerald-900/50"
            onClick={() => void abrirNoticiaRapida()}
            disabled={adding !== null || noticiaRapidaEnCurso}
          >
            {noticiaRapidaEnCurso ? "Creando noticia…" : "+ Noticia rápida"}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-orange-100 hover:bg-orange-900/40"
          onClick={() => void agregarSeccion("PUBLICIDAD")}
          disabled={adding !== null}
        >
          {adding === "PUBLICIDAD" ? "Creando…" : "+ Publicidad"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-indigo-100 hover:bg-indigo-900/40"
          onClick={() => void agregarSeccion("CIERRE")}
          disabled={adding !== null}
        >
          {adding === "CIERRE" ? "Creando…" : "+ Cierre"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-violet-100 hover:bg-violet-900/40"
          onClick={() => void abrirSelectorPublicidad()}
          disabled={adding !== null}
        >
          {adding === "CUNA" ? "Creando…" : "+ Publicidad"}
        </Button>
      </div>
    </Card>
  );
}

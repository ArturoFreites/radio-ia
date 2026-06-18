"use client";

import { TipoBloque } from "@prisma/client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { pollBloquePreviewGeneracion } from "@/components/editor/pollBloquePreview";
import { VozSelectorLocal } from "@/components/voces/VozSelectorLocal";

export type BloqueEditorItem = {
  id: string;
  titulo: string;
  tipo: TipoBloque;
  orden: number;
  vozId: string | null;
  config: Record<string, unknown>;
  estado: string;
  elevenlabsVoiceId: string | null;
  elevenlabsVoiceId2: string | null;
  guion: string | null;
  audioUrl: string | null;
  duracion: number | null;
};

function formatDuracion(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function badgeTipoClass(tipo: TipoBloque): string {
  if (tipo === "APERTURA") return "bg-sky-900/80 text-sky-100 border-sky-700";
  if (tipo === "NOTICIA") return "bg-emerald-900/80 text-emerald-100 border-emerald-700";
  if (tipo === "PUBLICIDAD") return "bg-orange-900/80 text-orange-100 border-orange-700";
  if (tipo === "CIERRE") return "bg-indigo-900/80 text-indigo-100 border-indigo-700";
  if (tipo === "CUNA") return "bg-violet-900/80 text-violet-100 border-violet-700";
  return "bg-zinc-800 text-zinc-300 border-zinc-600";
}

function resolvePlaybackUrl(bloque: BloqueEditorItem): string | null {
  if (bloque.tipo === "CUNA" && bloque.audioUrl) {
    return `/api/audio/preview/${bloque.id}`;
  }
  if (bloque.audioUrl?.startsWith("/api/audio/preview/")) {
    return bloque.audioUrl;
  }
  return null;
}

type NoticiaRssHeadline = {
  titulo: string;
  resumen: string;
  url: string;
  fecha: string;
  fuente: string;
};

function esEstadoGenerando(estado: string): boolean {
  return estado === "GENERANDO_GUION" || estado === "GENERANDO_AUDIO" || estado === "GUION_LISTO";
}

function badgeEstado(estado: string): { label: string; className: string; pulse?: boolean } {
  if (estado === "LISTO") return { label: "LISTO", className: "bg-emerald-900/70 text-emerald-100 border-emerald-700" };
  if (estado === "ERROR") return { label: "ERROR", className: "bg-red-900/70 text-red-100 border-red-700" };
  if (esEstadoGenerando(estado)) return { label: "GENERANDO", className: "bg-amber-900/70 text-amber-100 border-amber-600", pulse: true };
  return { label: "PENDIENTE", className: "bg-zinc-800 text-zinc-300 border-zinc-600" };
}

type TipoSeccionEditor = Extract<TipoBloque, "APERTURA" | "NOTICIA" | "PUBLICIDAD" | "CIERRE" | "CUNA">;

function esTipoSeccion(tipo: TipoBloque): tipo is TipoSeccionEditor {
  return (
    tipo === "APERTURA" ||
    tipo === "NOTICIA" ||
    tipo === "PUBLICIDAD" ||
    tipo === "CIERRE" ||
    tipo === "CUNA"
  );
}

export function BloqueCard({
  bloque,
  expanded,
  tieneFuentesRss,
  elevenlabsDisponible,
  onExpand,
  onDelete,
  onUpdate,
}: {
  bloque: BloqueEditorItem;
  expanded: boolean;
  tieneFuentesRss: boolean;
  elevenlabsDisponible: boolean;
  onExpand: (bloqueId: string | null) => void;
  onDelete: (bloqueId: string) => void;
  onUpdate: (bloqueId: string, patch: Partial<BloqueEditorItem>) => void;
}): React.ReactElement {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bloque.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [localConfig, setLocalConfig] = useState(bloque.config);
  const [tituloEdit, setTituloEdit] = useState("");
  const [tituloEditing, setTituloEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [analisisError, setAnalisisError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [resumenExpandido, setResumenExpandido] = useState(false);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [rssAbierto, setRssAbierto] = useState(false);
  const [rssCargando, setRssCargando] = useState(false);
  const [rssItems, setRssItems] = useState<NoticiaRssHeadline[]>([]);
  const [rssCargado, setRssCargado] = useState(false);

  const configKey = JSON.stringify(bloque.config);
  // Sincronizar borrador local cuando el servidor envía config nueva (p. ej. polling tras preview).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync explícito desde props serializadas
    setLocalConfig(bloque.config);
  }, [bloque.id, configKey, bloque.config]);

  const persistConfig = useCallback(async (): Promise<void> => {
    setSaving(true);
    const res = await fetch(`/api/bloques/${bloque.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: localConfig,
        elevenlabsVoiceId: bloque.elevenlabsVoiceId,
        elevenlabsVoiceId2: bloque.elevenlabsVoiceId2,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("No se pudo guardar la configuración del bloque");
      return;
    }
    const updated = (await res.json().catch(() => null)) as {
      config?: Record<string, unknown>;
      elevenlabsVoiceId?: string | null;
      elevenlabsVoiceId2?: string | null;
    } | null;
    onUpdate(bloque.id, {
      config: (updated?.config ?? localConfig) as Record<string, unknown>,
      ...(updated?.elevenlabsVoiceId !== undefined ? { elevenlabsVoiceId: updated.elevenlabsVoiceId } : {}),
      ...(updated?.elevenlabsVoiceId2 !== undefined ? { elevenlabsVoiceId2: updated.elevenlabsVoiceId2 } : {}),
    });
    toast.success("Configuración guardada");
  }, [
    bloque.id,
    bloque.elevenlabsVoiceId,
    bloque.elevenlabsVoiceId2,
    localConfig,
    onUpdate,
  ]);

  const patchVoces = async (patch: { elevenlabsVoiceId?: string | null; elevenlabsVoiceId2?: string | null }): Promise<void> => {
    const res = await fetch(`/api/bloques/${bloque.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error("No se pudo guardar la voz");
      return;
    }
    onUpdate(bloque.id, patch);
  };

  const guardarTituloSiCambio = async (): Promise<void> => {
    const next = tituloEdit.trim();
    if (!next || next === bloque.titulo) {
      return;
    }
    const res = await fetch(`/api/bloques/${bloque.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: next }),
    });
    if (!res.ok) {
      toast.error("No se pudo guardar el título");
      setTituloEdit(bloque.titulo);
      return;
    }
    onUpdate(bloque.id, { titulo: next });
  };

  const analizarNoticia = async (urlOverride?: string): Promise<void> => {
    const url = (urlOverride ?? String(localConfig.urlNoticia ?? "")).trim();
    if (!url) {
      toast.error("Pegá una URL de noticia");
      return;
    }
    setAnalisisError(null);
    setAnalizando(true);
    try {
      const res = await fetch(`/api/bloques/${bloque.id}/analizar-noticia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = typeof payload?.error === "string" ? payload.error : "No se pudo analizar la noticia";
        setAnalisisError(msg);
        toast.error(msg);
        return;
      }
      const contenido = typeof payload?.contenido === "string" ? payload.contenido : "";
      const next = { ...localConfig, urlNoticia: url, contenidoNoticiaCache: contenido };
      setLocalConfig(next);
      if (urlOverride) {
        await fetch(`/api/bloques/${bloque.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: next }),
        });
      }
      onUpdate(bloque.id, { config: next });
      toast.success("Noticia analizada");
    } finally {
      setAnalizando(false);
    }
  };

  const abrirFeedRss = async (): Promise<void> => {
    if (rssAbierto) {
      setRssAbierto(false);
      return;
    }
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

  const elegirNoticiaRss = (item: NoticiaRssHeadline): void => {
    const next = { ...localConfig, urlNoticia: item.url };
    setLocalConfig(next);
    setRssAbierto(false);
    void analizarNoticia(item.url);
  };

  const buscarAnunciante = async (): Promise<void> => {
    const nombre = String(localConfig.nombreAnunciante ?? "").trim();
    if (!nombre) {
      toast.error("Completá el nombre del anunciante antes de buscar");
      return;
    }
    setBuscando(true);
    try {
      const pre = await fetch(`/api/bloques/${bloque.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            ...localConfig,
            nombreAnunciante: nombre,
            urlAnunciante: String(localConfig.urlAnunciante ?? "").trim(),
          },
        }),
      });
      if (!pre.ok) {
        toast.error("No se pudo guardar datos del anunciante");
        return;
      }
      const res = await fetch(`/api/bloques/${bloque.id}/buscar-anunciante`, { method: "POST" });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(typeof payload?.error === "string" ? payload.error : "No se pudo buscar información");
        return;
      }
      const info = typeof payload?.info === "string" ? payload.info : "";
      const next = { ...localConfig, nombreAnunciante: nombre, infoAnuncianteCache: info };
      setLocalConfig(next);
      onUpdate(bloque.id, { config: next });
      toast.success("Información encontrada");
    } finally {
      setBuscando(false);
    }
  };

  const generarPreview = async (): Promise<void> => {
    if (!elevenlabsDisponible) {
      toast.error("ELEVENLABS_API_KEY no configurada. Configurá la variable de entorno para generar audio.");
      return;
    }
    setGenerando(true);
    try {
      const res = await fetch(`/api/bloques/${bloque.id}/generar-preview`, { method: "POST" });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(typeof payload?.error === "string" ? payload.error : "No se pudo encolar la generación");
        setGenerando(false);
        return;
      }
      onUpdate(bloque.id, { estado: "GENERANDO_GUION" });
      toast.message("Generando preview…", { description: "Puede tardar hasta unos minutos" });
      const result = await pollBloquePreviewGeneracion({
        bloqueId: bloque.id,
        onUpdate: (patch) => onUpdate(bloque.id, patch),
        isActive: () => mounted.current,
        fallbackConfig: bloque.config,
      });
      if (!mounted.current) return;
      if (result === "listo") {
        toast.success("Preview listo");
        return;
      }
      if (result === "error") {
        toast.error("Error al generar preview");
        return;
      }
      toast.error("Tiempo de espera agotado");
    } finally {
      if (mounted.current) setGenerando(false);
    }
  };

  const eliminar = (): void => {
    if (!confirm("¿Eliminar esta sección?")) return;
    void (async () => {
      const res = await fetch(`/api/bloques/${bloque.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("No se pudo eliminar el bloque");
        return;
      }
      onDelete(bloque.id);
      toast.success("Sección eliminada");
    })();
  };

  const toggleExpand = (): void => {
    if (!esTipoSeccion(bloque.tipo)) return;
    onExpand(expanded ? null : bloque.id);
  };

  const est = badgeEstado(bloque.estado);
  const esSeccion = esTipoSeccion(bloque.tipo);
  const previewUrl = resolvePlaybackUrl(bloque);

  const noticiaListoParaPreview =
    Boolean(String(localConfig.contenidoNoticiaCache ?? "").trim()) &&
    Boolean(bloque.elevenlabsVoiceId) &&
    Boolean(bloque.elevenlabsVoiceId2);

  const renderFormulario = (): React.ReactElement | null => {
    if (bloque.tipo === "APERTURA") {
      const puedePreview = Boolean(bloque.elevenlabsVoiceId);
      return (
        <div className="space-y-3 border-t border-zinc-800 bg-zinc-950/80 px-3 py-3 text-xs">
          <Input
            placeholder="Nombre del programa"
            value={String(localConfig.nombrePrograma ?? "")}
            onChange={(e) => setLocalConfig((c) => ({ ...c, nombrePrograma: e.target.value }))}
          />
          <Select label="Horario" value={String(localConfig.horario ?? "mañana")} onChange={(e) => setLocalConfig((c) => ({ ...c, horario: e.target.value }))}>
            <option value="mañana">Mañana</option>
            <option value="tarde">Tarde</option>
            <option value="noche">Noche</option>
          </Select>
          <VozSelectorLocal label="Voz" value={bloque.elevenlabsVoiceId} onChange={(id) => void patchVoces({ elevenlabsVoiceId: id })} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void persistConfig()} disabled={saving}>
              {saving ? "Guardando…" : "Guardar config"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void generarPreview()}
              disabled={generando || !puedePreview || !elevenlabsDisponible}
            >
              {generando ? "Generando…" : "Generar preview"}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="text-zinc-400" onClick={() => onExpand(null)}>
              Cerrar
            </Button>
          </div>
          {!elevenlabsDisponible ? (
            <p className="text-[11px] text-amber-300">ELEVENLABS_API_KEY no configurada — no se puede generar audio.</p>
          ) : null}
          {previewUrl ? <audio className="mt-2 w-full max-w-md" controls src={previewUrl} /> : null}
        </div>
      );
    }
    if (bloque.tipo === "NOTICIA") {
      const contenido = String(localConfig.contenidoNoticiaCache ?? "");
      return (
        <div className="space-y-3 border-t border-zinc-800 bg-zinc-950/80 px-3 py-3 text-xs">
          {tieneFuentesRss ? (
            <div>
              <Button type="button" variant="secondary" size="sm" onClick={() => void abrirFeedRss()} disabled={rssCargando}>
                {rssCargando ? "Cargando feed…" : "Elegir del feed"}
              </Button>
              {rssAbierto ? (
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded border border-emerald-900/50 bg-black/30 p-1">
                  {rssItems.length === 0 && !rssCargando ? (
                    <li className="px-2 py-1 text-zinc-500">Sin titulares disponibles</li>
                  ) : null}
                  {rssItems.map((item) => (
                    <li key={item.url}>
                      <button
                        type="button"
                        className="w-full rounded px-2 py-1.5 text-left hover:bg-emerald-950/50"
                        onClick={() => elegirNoticiaRss(item)}
                        disabled={analizando}
                      >
                        <span className="block font-medium text-emerald-100">{item.titulo}</span>
                        <span className="text-[10px] text-zinc-500">
                          {item.fuente} · {new Date(item.fecha).toLocaleString("es-AR")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Input
              className="min-w-0 flex-1"
              placeholder="URL de la noticia"
              value={String(localConfig.urlNoticia ?? "")}
              onChange={(e) => setLocalConfig((c) => ({ ...c, urlNoticia: e.target.value }))}
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => void analizarNoticia()} disabled={analizando}>
              {analizando ? "Analizando…" : "Analizar"}
            </Button>
          </div>
          {analizando ? <p className="text-amber-200/90">Analizando…</p> : null}
          {!analizando && contenido ? <p className="text-emerald-400/90">Noticia analizada ✓</p> : null}
          {analisisError ? <p className="text-red-400">{analisisError}</p> : null}
          {contenido ? (
            <div>
              <p className={`whitespace-pre-wrap text-zinc-300 ${resumenExpandido ? "" : "line-clamp-3"}`}>{contenido}</p>
              {contenido.length > 200 ? (
                <button type="button" className="mt-1 text-[11px] text-sky-400 underline" onClick={() => setResumenExpandido((v) => !v)}>
                  {resumenExpandido ? "Ver menos" : "Ver más"}
                </button>
              ) : null}
            </div>
          ) : null}
          <VozSelectorLocal label="Voz A" value={bloque.elevenlabsVoiceId} onChange={(id) => void patchVoces({ elevenlabsVoiceId: id })} />
          <VozSelectorLocal label="Voz B" value={bloque.elevenlabsVoiceId2} onChange={(id) => void patchVoces({ elevenlabsVoiceId2: id })} />
          <Select
            label="Estilo"
            value={String(localConfig.estiloConversacion ?? "profesional")}
            onChange={(e) => setLocalConfig((c) => ({ ...c, estiloConversacion: e.target.value }))}
          >
            <option value="profesional">Profesional</option>
            <option value="distendido">Distendido</option>
          </Select>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void persistConfig()} disabled={saving}>
              {saving ? "Guardando…" : "Guardar config"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void generarPreview()}
              disabled={generando || !noticiaListoParaPreview || !elevenlabsDisponible}
            >
              {generando ? "Generando…" : "Generar preview"}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="text-zinc-400" onClick={() => onExpand(null)}>
              Cerrar
            </Button>
          </div>
          {!elevenlabsDisponible ? (
            <p className="text-[11px] text-amber-300">ELEVENLABS_API_KEY no configurada — no se puede generar audio.</p>
          ) : null}
          {previewUrl ? <audio className="mt-2 w-full max-w-md" controls src={previewUrl} /> : null}
          {bloque.guion ? (
            <div className="rounded border border-zinc-800 bg-black/40">
              <button
                type="button"
                className="flex w-full items-center justify-between px-2 py-1.5 text-left text-[11px] text-zinc-400"
                onClick={() => setDialogoAbierto((v) => !v)}
              >
                Ver diálogo
                <span>{dialogoAbierto ? "▲" : "▼"}</span>
              </button>
              {dialogoAbierto ? (
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap border-t border-zinc-800 p-2 text-[11px] text-zinc-300">{bloque.guion}</pre>
              ) : null}
            </div>
          ) : null}
        </div>
      );
    }
    if (bloque.tipo === "PUBLICIDAD") {
      const dur = Number(localConfig.duracionObjetivo ?? 20);
      const nombreOk = String(localConfig.nombreAnunciante ?? "").trim().length > 0;
      const puedePreview = nombreOk && Boolean(bloque.elevenlabsVoiceId);
      return (
        <div className="space-y-3 border-t border-zinc-800 bg-zinc-950/80 px-3 py-3 text-xs">
          <Input
            placeholder="Nombre del anunciante (obligatorio)"
            value={String(localConfig.nombreAnunciante ?? "")}
            onChange={(e) => setLocalConfig((c) => ({ ...c, nombreAnunciante: e.target.value }))}
          />
          <Input
            placeholder="URL del anunciante (opcional)"
            value={String(localConfig.urlAnunciante ?? "")}
            onChange={(e) => setLocalConfig((c) => ({ ...c, urlAnunciante: e.target.value }))}
          />
          <Button type="button" variant="secondary" size="sm" onClick={() => void buscarAnunciante()} disabled={buscando}>
            {buscando ? "Buscando…" : "Buscar información"}
          </Button>
          <Textarea
            className="min-h-24 text-[11px]"
            placeholder="Info del anunciante"
            value={String(localConfig.infoAnuncianteCache ?? "")}
            onChange={(e) => setLocalConfig((c) => ({ ...c, infoAnuncianteCache: e.target.value }))}
          />
          <label className="block text-zinc-500">
            Duración objetivo: {dur}s
            <input
              type="range"
              className="mt-1 block w-full"
              min={15}
              max={30}
              value={dur}
              onChange={(e) => setLocalConfig((c) => ({ ...c, duracionObjetivo: Number(e.target.value) }))}
            />
          </label>
          <VozSelectorLocal label="Voz" value={bloque.elevenlabsVoiceId} onChange={(id) => void patchVoces({ elevenlabsVoiceId: id })} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void persistConfig()} disabled={saving}>
              {saving ? "Guardando…" : "Guardar config"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void generarPreview()}
              disabled={generando || !puedePreview || !elevenlabsDisponible}
            >
              {generando ? "Generando…" : "Generar preview"}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="text-zinc-400" onClick={() => onExpand(null)}>
              Cerrar
            </Button>
          </div>
          {!elevenlabsDisponible ? (
            <p className="text-[11px] text-amber-300">ELEVENLABS_API_KEY no configurada — no se puede generar audio.</p>
          ) : null}
          {previewUrl ? <audio className="mt-2 w-full max-w-md" controls src={previewUrl} /> : null}
        </div>
      );
    }
    if (bloque.tipo === "CIERRE") {
      const puedePreview = Boolean(bloque.elevenlabsVoiceId);
      return (
        <div className="space-y-3 border-t border-zinc-800 bg-zinc-950/80 px-3 py-3 text-xs">
          <Input
            placeholder="Nombre del programa"
            value={String(localConfig.nombrePrograma ?? "")}
            onChange={(e) => setLocalConfig((c) => ({ ...c, nombrePrograma: e.target.value }))}
          />
          <Textarea
            className="min-h-16 text-[11px]"
            placeholder="Mensaje de despedida (opcional)"
            value={String(localConfig.mensajeDespedida ?? "")}
            onChange={(e) => setLocalConfig((c) => ({ ...c, mensajeDespedida: e.target.value }))}
          />
          <VozSelectorLocal label="Voz" value={bloque.elevenlabsVoiceId} onChange={(id) => void patchVoces({ elevenlabsVoiceId: id })} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void persistConfig()} disabled={saving}>
              {saving ? "Guardando…" : "Guardar config"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void generarPreview()}
              disabled={generando || !puedePreview || !elevenlabsDisponible}
            >
              {generando ? "Generando…" : "Generar preview"}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="text-zinc-400" onClick={() => onExpand(null)}>
              Cerrar
            </Button>
          </div>
          {!elevenlabsDisponible ? (
            <p className="text-[11px] text-amber-300">ELEVENLABS_API_KEY no configurada — no se puede generar audio.</p>
          ) : null}
          {previewUrl ? <audio className="mt-2 w-full max-w-md" controls src={previewUrl} /> : null}
        </div>
      );
    }
    if (bloque.tipo === "CUNA") {
      return (
        <div className="space-y-3 border-t border-zinc-800 bg-zinc-950/80 px-3 py-3 text-xs">
          <p className="text-zinc-300">
            <span className="text-zinc-500">Publicidad:</span>{" "}
            {String(localConfig.publicidadNombre ?? localConfig.cunaAnunciante ?? "—")}
          </p>
          {previewUrl ? <audio className="mt-2 w-full max-w-md" controls src={previewUrl} /> : null}
          <Button type="button" variant="ghost" size="sm" className="text-zinc-400" onClick={() => onExpand(null)}>
            Cerrar
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-zinc-700 bg-zinc-900/90 ${isDragging ? "opacity-60 shadow-lg" : ""}`}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          className="shrink-0 cursor-grab touch-none rounded border border-zinc-700 px-1.5 py-1 text-zinc-400 hover:bg-zinc-800 active:cursor-grabbing"
          aria-label="Reordenar sección"
          {...attributes}
          {...listeners}
        >
          <span className="text-sm leading-none">⠿</span>
        </button>
        <button
          type="button"
          className={`flex min-w-0 flex-1 items-center gap-2 text-left ${esSeccion ? "cursor-pointer hover:bg-zinc-800/50" : "cursor-default"}`}
          onClick={esSeccion ? toggleExpand : undefined}
        >
          <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${badgeTipoClass(bloque.tipo)}`}>{bloque.tipo}</span>
          <div className="min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
            {tituloEditing ? (
              <input
                className="w-full rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 text-sm font-medium text-zinc-100"
                value={tituloEdit}
                onChange={(e) => setTituloEdit(e.target.value)}
                onBlur={() => {
                  setTituloEditing(false);
                  void guardarTituloSiCambio();
                  setTituloEdit("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                autoFocus
              />
            ) : (
              <span
                className="block truncate text-sm font-medium text-zinc-100 underline decoration-zinc-600 decoration-dotted underline-offset-2"
                role="button"
                tabIndex={0}
                onClick={() => {
                  setTituloEdit(bloque.titulo);
                  setTituloEditing(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setTituloEdit(bloque.titulo);
                    setTituloEditing(true);
                  }
                }}
              >
                {bloque.titulo}
              </span>
            )}
          </div>
          <span
            className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${est.className} ${est.pulse ? "animate-pulse" : ""}`}
          >
            {est.label}
          </span>
          {bloque.duracion != null ? (
            <span className="shrink-0 text-xs tabular-nums text-zinc-400">{formatDuracion(bloque.duracion)}</span>
          ) : null}
        </button>
        <div className="shrink-0 w-36" onClick={(e) => e.stopPropagation()}>
          {previewUrl ? <audio className="h-8 w-full" controls src={previewUrl} /> : <span className="block h-8" />}
        </div>
        <button
          type="button"
          className="shrink-0 rounded border border-red-900/60 px-2 py-1 text-xs text-red-300 hover:bg-red-950/40"
          onClick={eliminar}
          aria-label="Eliminar sección"
        >
          ✕
        </button>
      </div>
      {expanded && esSeccion ? renderFormulario() : null}
    </div>
  );
}

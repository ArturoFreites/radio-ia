"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { GeneroVoz, TonoVoz } from "@prisma/client";
import { Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
    geminiVoiceId: string;
  };
};

type VocesManagerProps = {
  initialVoces: VozItem[];
};

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

function truncar(texto: string, max: number): string {
  if (texto.length <= max) {
    return texto;
  }
  return `${texto.slice(0, max)}…`;
}

function etiquetasVoz(labels: Record<string, string>): string {
  const partes: string[] = [];
  if (labels.gender) partes.push(labels.gender);
  if (labels.accent) partes.push(labels.accent);
  return partes.join(" · ");
}

function opcionVozLabel(voz: ElevenLabsVozItem): string {
  const etiquetas = etiquetasVoz(voz.labels);
  return etiquetas ? `${voz.name} (${etiquetas})` : voz.name;
}

export function VocesManager({ initialVoces }: VocesManagerProps): React.ReactElement {
  const [voces, setVoces] = useState<VozItem[]>(initialVoces);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [editingVozId, setEditingVozId] = useState<string | null>(null);
  const [elevenLabsVoces, setElevenLabsVoces] = useState<ElevenLabsVozItem[]>([]);
  const [elevenLabsLoading, setElevenLabsLoading] = useState(true);
  const [elevenLabsFallback, setElevenLabsFallback] = useState(false);

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

  const vozElevenLabsSeleccionada = useMemo(
    () => elevenLabsVoces.find((voz) => voz.voice_id === form.eventlabsVoiceId),
    [elevenLabsVoces, form.eventlabsVoiceId],
  );

  const reproducirPreview = (): void => {
    const previewUrl = vozElevenLabsSeleccionada?.preview_url;
    if (!previewUrl) {
      toast.error("Esta voz no tiene preview disponible");
      return;
    }
    const audio = new Audio(previewUrl);
    void audio.play().catch(() => {
      toast.error("No se pudo reproducir el preview");
    });
  };

  const onElevenLabsVoiceChange = (voiceId: string): void => {
    const voz = elevenLabsVoces.find((item) => item.voice_id === voiceId);
    setForm((prev) => ({
      ...prev,
      eventlabsVoiceId: voiceId,
      nombre: prev.nombre.trim() === "" && voz ? voz.name : prev.nombre,
    }));
  };

  const vocesOrdenadas = useMemo(
    () => [...voces].sort((a, b) => a.voz.nombre.localeCompare(b.voz.nombre)),
    [voces],
  );

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!form.nombre.trim() || !form.eventlabsVoiceId.trim()) {
      toast.error("Nombre y EventLabs voiceId son obligatorios");
      return;
    }

    setIsSaving(true);
    try {
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
        const payload = (await response.json().catch(() => null)) as { error?: { formErrors?: string[] } | string } | null;
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : payload?.error?.formErrors?.[0] ?? "No se pudo guardar la voz";
        throw new Error(message);
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
      setForm(INITIAL_FORM);
      toast.success("Voz guardada y disponible para generar");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la voz");
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (item: VozItem): void => {
    setForm({
      nombre: item.voz.nombre,
      eventlabsVoiceId: item.voz.geminiVoiceId,
      descripcion: item.voz.descripcion,
      genero: item.voz.genero,
      tono: item.voz.tono,
      nombreAlAire: item.nombreAlAire ?? "",
      personalidad: item.personalidad ?? "",
    });
    setEditingVozId(item.voz.id);
  };

  const cancelEdit = (): void => {
    setEditingVozId(null);
    setForm(INITIAL_FORM);
  };

  const submitEdit = async (): Promise<void> => {
    if (!editingVozId) return;
    if (!form.nombre.trim() || !form.eventlabsVoiceId.trim()) {
      toast.error("Nombre y EventLabs voiceId son obligatorios");
      return;
    }
    setIsSaving(true);
    try {
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
        const payload = (await response.json().catch(() => null)) as { error?: { formErrors?: string[] } | string } | null;
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : payload?.error?.formErrors?.[0] ?? "No se pudo actualizar la voz";
        throw new Error(message);
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
      toast.success("Voz actualizada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la voz");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteVoice = async (item: VozItem): Promise<void> => {
    if (!window.confirm(`Eliminar la voz "${item.voz.nombre}" de esta radio?`)) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/voces/${item.voz.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "No se pudo eliminar la voz");
      }
      setVoces((prev) => prev.filter((entry) => entry.voz.id !== item.voz.id));
      if (editingVozId === item.voz.id) {
        cancelEdit();
      }
      toast.success("Voz eliminada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la voz");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 rounded border border-zinc-800 bg-zinc-900 p-4 md:grid-cols-2"
        onSubmit={editingVozId ? (event) => void (event.preventDefault(), submitEdit()) : submit}
      >
        <Input
          placeholder="Nombre de voz (ej: Locutor Principal)"
          value={form.nombre}
          onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
        />
        {elevenLabsFallback ? (
          <div className="space-y-2">
            <p className="text-xs text-amber-300">
              No se pudo conectar con ElevenLabs. Ingresá el voice ID manualmente.
            </p>
            <Input
              placeholder="EventLabs voiceId"
              value={form.eventlabsVoiceId}
              onChange={(event) => setForm((prev) => ({ ...prev, eventlabsVoiceId: event.target.value }))}
            />
          </div>
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
                {elevenLabsLoading ? "Cargando voces…" : "Elegir voz de ElevenLabs…"}
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
              onClick={reproducirPreview}
              title="Escuchar preview"
            >
              <Volume2 className="h-4 w-4" aria-hidden />
              <span className="sr-only">Escuchar</span>
              <span className="hidden sm:inline">Escuchar</span>
            </Button>
          </div>
        )}
        <Input
          placeholder="Nombre al aire (ej: Carlos)"
          value={form.nombreAlAire}
          onChange={(event) => setForm((prev) => ({ ...prev, nombreAlAire: event.target.value }))}
        />
        <Input
          className="md:col-span-2"
          placeholder="Descripcion (opcional)"
          value={form.descripcion}
          onChange={(event) => setForm((prev) => ({ ...prev, descripcion: event.target.value }))}
        />
        <Textarea
          className="md:col-span-2"
          placeholder="Describe el carácter de este locutor para la IA"
          value={form.personalidad}
          onChange={(event) => setForm((prev) => ({ ...prev, personalidad: event.target.value }))}
          rows={3}
        />
        <Select value={form.genero} onChange={(event) => setForm((prev) => ({ ...prev, genero: event.target.value as GeneroVoz }))}>
          {Object.values(GeneroVoz).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Select value={form.tono} onChange={(event) => setForm((prev) => ({ ...prev, tono: event.target.value as TonoVoz }))}>
          {Object.values(TonoVoz).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Button className="md:col-span-2" type="submit" disabled={isSaving}>
          {isSaving ? "Guardando..." : editingVozId ? "Guardar cambios" : "Agregar locutor"}
        </Button>
        {editingVozId ? (
          <Button className="md:col-span-2" variant="secondary" type="button" onClick={cancelEdit}>
            Cancelar edicion
          </Button>
        ) : null}
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {vocesOrdenadas.map((item) => (
          <Card key={item.id}>
            <p className="font-medium">{item.voz.nombre}</p>
            {item.nombreAlAire ? (
              <p className="text-sm font-semibold text-zinc-100">{item.nombreAlAire}</p>
            ) : null}
            {item.personalidad ? (
              <p className="text-xs text-zinc-400">{truncar(item.personalidad, 60)}</p>
            ) : null}
            <p className="text-sm text-zinc-400">
              {item.voz.genero} · {item.voz.tono}
            </p>
            <p className="text-xs text-zinc-500">EventLabs voiceId: {item.voz.geminiVoiceId}</p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" size="sm" type="button" onClick={() => startEdit(item)}>
                Editar
              </Button>
              <Button variant="danger" size="sm" type="button" onClick={() => void deleteVoice(item)}>
                Eliminar
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

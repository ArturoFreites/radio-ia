"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { ConfiguracionResponse, PatchConfigBody } from "@/types/configuracion";

type ConfiguracionEditorProps = {
  initial: ConfiguracionResponse;
};

type SectionError = string | null;

async function patchConfig(body: PatchConfigBody): Promise<ConfiguracionResponse> {
  const response = await fetch("/api/configuracion", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as
    | ConfiguracionResponse
    | { error?: string }
    | null;
  if (!response.ok) {
    const message = typeof payload === "object" && payload && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : "No se pudo guardar";
    throw new Error(message);
  }
  return payload as ConfiguracionResponse;
}

export function ConfiguracionEditor({ initial }: ConfiguracionEditorProps): React.ReactElement {
  const router = useRouter();
  const [config, setConfig] = useState<ConfiguracionResponse>(initial);
  const [nombre, setNombre] = useState(initial.nombre);
  const [estiloLocucion, setEstiloLocucion] = useState(initial.estiloLocucion ?? "");
  const [nombreError, setNombreError] = useState<SectionError>(null);
  const [estiloError, setEstiloError] = useState<SectionError>(null);
  const [savingNombre, setSavingNombre] = useState(false);
  const [savingEstilo, setSavingEstilo] = useState(false);

  const guardarNombre = async (): Promise<void> => {
    const trimmed = nombre.trim();
    if (trimmed.length < 2) {
      setNombreError("El nombre debe tener al menos 2 caracteres");
      return;
    }
    setNombreError(null);
    setSavingNombre(true);
    try {
      const updated = await patchConfig({ nombre: trimmed });
      setConfig(updated);
      setNombre(updated.nombre);
      toast.success("Guardado");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar";
      setNombreError(message);
      toast.error(message);
    } finally {
      setSavingNombre(false);
    }
  };

  const guardarEstilo = async (): Promise<void> => {
    if (estiloLocucion.length > 500) {
      setEstiloError("Maximo 500 caracteres");
      return;
    }
    setEstiloError(null);
    setSavingEstilo(true);
    try {
      const updated = await patchConfig({ estiloLocucion });
      setConfig(updated);
      setEstiloLocucion(updated.estiloLocucion ?? "");
      toast.success("Guardado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar";
      setEstiloError(message);
      toast.error(message);
    } finally {
      setSavingEstilo(false);
    }
  };

  const copiarTexto = async (texto: string, etiqueta: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(`${etiqueta} copiada al portapapeles`);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-medium text-white">Nombre de la radio</h2>
        <Input
          type="text"
          value={nombre}
          onChange={(event) => {
            setNombre(event.target.value);
            if (nombreError) setNombreError(null);
          }}
          maxLength={80}
          className="mt-3 w-full max-w-md"
        />
        {nombreError ? <p className="mt-2 text-sm text-red-400">{nombreError}</p> : null}
        <Button type="button" onClick={() => void guardarNombre()} disabled={savingNombre} className="mt-3">
          {savingNombre ? "Guardando…" : "Guardar"}
        </Button>
      </Card>

      <Card>
        <h2 className="text-lg font-medium text-white">Estilo de locucion</h2>
        <p className="mt-1 text-sm text-zinc-400">Instruccion de tono que la IA usa al generar guiones.</p>
        <Textarea
          value={estiloLocucion}
          onChange={(event) => {
            setEstiloLocucion(event.target.value);
            if (estiloError) setEstiloError(null);
          }}
          maxLength={500}
          rows={4}
          placeholder='Ej: "Tono calido y cercano, evitar tecnicismos"'
          className="mt-3 w-full max-w-2xl"
        />
        {estiloError ? <p className="mt-2 text-sm text-red-400">{estiloError}</p> : null}
        <Button type="button" onClick={() => void guardarEstilo()} disabled={savingEstilo} className="mt-3">
          {savingEstilo ? "Guardando…" : "Guardar"}
        </Button>
      </Card>

      <Card>
        <h2 className="text-lg font-medium text-white">Pagina de aire</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Abri esta URL en un navegador dedicado (sin login) y capturala con OBS para transmitir.
        </p>
        <p className="mt-3 break-all font-mono text-sm text-amber-200/90">{config.urlAire}</p>
        <p className="mt-2 text-xs text-zinc-500">
          Token en la query: <span className="font-mono">{config.aireToken}</span>
        </p>
        <Button type="button" variant="secondary" onClick={() => void copiarTexto(config.urlAire, "URL")} className="mt-3">
          Copiar
        </Button>
      </Card>
    </div>
  );
}

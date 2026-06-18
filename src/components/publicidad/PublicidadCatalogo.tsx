"use client";

import { FormEvent, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { formatearMontoArs } from "@/lib/publicidad/format";
import { cn } from "@/lib/utils";
import type { EstiloPublicidad, PublicidadCliente } from "@/types/publicidad";

type PublicidadCatalogoProps = {
  initialClientes: PublicidadCliente[];
};

type FormState = {
  nombre: string;
  rubro: string;
  contacto: string;
  telefono: string;
  email: string;
  notas: string;
  montoMensual: string;
  texto: string;
  estilo: EstiloPublicidad;
  esActivo: boolean;
};

const INITIAL_FORM: FormState = {
  nombre: "",
  rubro: "",
  contacto: "",
  telefono: "",
  email: "",
  notas: "",
  montoMensual: "",
  texto: "",
  estilo: "energetico",
  esActivo: true,
};

const ESTILOS: Array<{ value: EstiloPublicidad; label: string }> = [
  { value: "energetico", label: "Enérgico" },
  { value: "elegante", label: "Elegante" },
  { value: "humoristico", label: "Humorístico" },
];

function parseMonto(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function clienteToForm(item: PublicidadCliente): FormState {
  return {
    nombre: item.nombre,
    rubro: item.rubro ?? "",
    contacto: item.contacto ?? "",
    telefono: item.telefono ?? "",
    email: item.email ?? "",
    notas: item.notas ?? "",
    montoMensual: item.montoMensual != null ? String(item.montoMensual) : "",
    texto: item.texto ?? "",
    estilo: (item.estilo as EstiloPublicidad) ?? "energetico",
    esActivo: item.esActivo,
  };
}

export function PublicidadCatalogo({ initialClientes }: PublicidadCatalogoProps): React.ReactElement {
  const formRef = useRef<HTMLFormElement>(null);
  const [clientes, setClientes] = useState<PublicidadCliente[]>(initialClientes);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const activasAlAire = clientes.filter(
    (item) => item.esActivo && (item.texto?.trim() || item.audioUrl),
  ).length;

  const toggleExpanded = (id: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  const startEdit = (item: PublicidadCliente): void => {
    setForm(clienteToForm(item));
    setEditingId(item.id);
    setExpanded((prev) => new Set(prev).add(item.id));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const validarForm = (): number | null | undefined => {
    if (!form.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return undefined;
    }
    const montoMensual = parseMonto(form.montoMensual);
    if (form.montoMensual.trim() && montoMensual === undefined) {
      toast.error("La cuota mensual no es válida");
      return undefined;
    }
    return montoMensual ?? null;
  };

  const generarGuion = async (): Promise<void> => {
    if (!form.nombre.trim()) {
      toast.error("Completá el nombre antes de generar el guión");
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch("/api/anunciantes/generar-guion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          rubro: form.rubro.trim() || undefined,
          telefono: form.telefono.trim() || undefined,
          notas: form.notas.trim() || undefined,
          estilo: form.estilo,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(typeof payload?.error === "string" ? payload.error : "No se pudo generar el guión");
      }
      const payload = (await response.json()) as { texto: string };
      setForm((prev) => ({ ...prev, texto: payload.texto }));
      toast.success("Guión generado con IA");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el guión");
    } finally {
      setIsGenerating(false);
    }
  };

  const submitCliente = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const montoMensual = validarForm();
    if (montoMensual === undefined) return;

    setIsSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        rubro: form.rubro.trim() || null,
        contacto: form.contacto.trim() || null,
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        notas: form.notas.trim() || null,
        montoMensual,
        texto: form.texto.trim() || null,
        estilo: form.estilo,
        esActivo: form.esActivo,
      };

      if (editingId) {
        const response = await fetch(`/api/anunciantes/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const err = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(typeof err?.error === "string" ? err.error : "No se pudo actualizar");
        }
        const actualizado = (await response.json()) as PublicidadCliente;
        setClientes((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...actualizado } : item)));
        cancelEdit();
        toast.success("Publicidad actualizada");
      } else {
        const response = await fetch("/api/anunciantes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            rubro: payload.rubro ?? undefined,
            contacto: payload.contacto ?? undefined,
            telefono: payload.telefono ?? undefined,
            email: payload.email ?? undefined,
            notas: payload.notas ?? undefined,
            montoMensual: montoMensual ?? undefined,
            texto: payload.texto ?? undefined,
          }),
        });
        if (!response.ok) {
          const err = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(typeof err?.error === "string" ? err.error : "No se pudo crear");
        }
        const created = (await response.json()) as PublicidadCliente;
        setClientes((prev) => [created, ...prev]);
        setExpanded((prev) => new Set(prev).add(created.id));
        setForm(INITIAL_FORM);
        toast.success("Publicidad agregada");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const eliminar = async (item: PublicidadCliente): Promise<void> => {
    if (!window.confirm(`¿Eliminar la publicidad "${item.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    setDeletingId(item.id);
    try {
      const response = await fetch(`/api/anunciantes/${item.id}`, { method: "DELETE" });
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(typeof err?.error === "string" ? err.error : "No se pudo eliminar");
      }
      setClientes((prev) => prev.filter((c) => c.id !== item.id));
      if (editingId === item.id) cancelEdit();
      toast.success("Publicidad eliminada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActivo = async (item: PublicidadCliente, esActivo: boolean): Promise<void> => {
    try {
      const response = await fetch(`/api/anunciantes/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ esActivo }),
      });
      if (!response.ok) throw new Error("No se pudo actualizar");
      setClientes((prev) => prev.map((c) => (c.id === item.id ? { ...c, esActivo } : c)));
    } catch {
      toast.error("No se pudo cambiar el estado");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-400">
        <p>
          Cada publicidad es un anunciante con un único texto que se reproduce al aire. Usá{" "}
          <strong className="font-medium text-zinc-200">Generar guión con IA</strong> para redactarlo y editá el
          resultado antes de guardar.
        </p>
        <p className="mt-2 text-zinc-500">
          Activas al aire: <span className="font-medium text-zinc-300">{activasAlAire}</span>
        </p>
      </div>

      <form
        ref={formRef}
        className={cn(
          "grid gap-3 rounded border bg-zinc-900 p-4 md:grid-cols-2",
          editingId ? "border-amber-600/40 ring-1 ring-amber-600/20" : "border-zinc-800",
        )}
        onSubmit={submitCliente}
      >
        {editingId ? (
          <div className="flex items-center justify-between md:col-span-2">
            <p className="text-sm font-medium text-amber-300">
              Editando: {clientes.find((c) => c.id === editingId)?.nombre ?? "publicidad"}
            </p>
            <button
              type="button"
              className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              onClick={cancelEdit}
              aria-label="Cancelar edición"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <Input
          placeholder="Nombre del anunciante"
          value={form.nombre}
          onChange={(ev) => setForm((prev) => ({ ...prev, nombre: ev.target.value }))}
        />
        <Input
          placeholder="Rubro (opcional)"
          value={form.rubro}
          onChange={(ev) => setForm((prev) => ({ ...prev, rubro: ev.target.value }))}
        />
        <Input
          placeholder="Cuota mensual fija (ARS)"
          type="number"
          min={0}
          step={1000}
          value={form.montoMensual}
          onChange={(ev) => setForm((prev) => ({ ...prev, montoMensual: ev.target.value }))}
        />
        <Select
          label="Estilo del guión"
          value={form.estilo}
          onChange={(ev) => setForm((prev) => ({ ...prev, estilo: ev.target.value as EstiloPublicidad }))}
        >
          {ESTILOS.map((estilo) => (
            <option key={estilo.value} value={estilo.value}>
              {estilo.label}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Contacto"
          value={form.contacto}
          onChange={(ev) => setForm((prev) => ({ ...prev, contacto: ev.target.value }))}
        />
        <Input
          placeholder="Teléfono"
          value={form.telefono}
          onChange={(ev) => setForm((prev) => ({ ...prev, telefono: ev.target.value }))}
        />
        <Input
          placeholder="Email"
          value={form.email}
          onChange={(ev) => setForm((prev) => ({ ...prev, email: ev.target.value }))}
        />
        <Textarea
          className="md:col-span-2"
          placeholder="Notas internas (también las usa la IA al generar el guión)"
          value={form.notas}
          onChange={(ev) => setForm((prev) => ({ ...prev, notas: ev.target.value }))}
          rows={2}
        />
        <div className="space-y-2 md:col-span-2">
          <Textarea
            placeholder="Texto literal que dirá el locutor (sin música, acotaciones ni markdown)"
            value={form.texto}
            onChange={(ev) => setForm((prev) => ({ ...prev, texto: ev.target.value }))}
            rows={5}
          />
          <Button type="button" variant="secondary" size="sm" disabled={isGenerating} onClick={() => void generarGuion()}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            {isGenerating ? "Generando…" : "Generar guión con IA"}
          </Button>
        </div>
        {editingId ? (
          <label className="flex items-center gap-2 text-sm text-zinc-300 md:col-span-2">
            <input
              type="checkbox"
              checked={form.esActivo}
              onChange={(ev) => setForm((prev) => ({ ...prev, esActivo: ev.target.checked }))}
            />
            Activa en rotación al aire y en pagos
          </label>
        ) : null}
        <Button className="md:col-span-2" type="submit" disabled={isSaving}>
          {isSaving ? "Guardando..." : editingId ? "Guardar cambios" : "Agregar publicidad"}
        </Button>
        {editingId ? (
          <Button className="md:col-span-2" type="button" variant="secondary" disabled={isSaving} onClick={cancelEdit}>
            Cancelar edición
          </Button>
        ) : null}
      </form>

      <div className="space-y-2">
        {clientes.length === 0 ? (
          <p className="text-sm text-zinc-400">No hay publicidades. Agregá la primera arriba.</p>
        ) : (
          clientes.map((item) => {
            const isOpen = expanded.has(item.id);
            const isEditingThis = editingId === item.id;
            const alAire = item.esActivo && (item.texto?.trim() || item.audioUrl);

            return (
              <Card
                key={item.id}
                className={cn("p-3", isEditingThis && "border-amber-600/30 ring-1 ring-amber-600/10")}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="flex flex-1 items-start gap-2 text-left"
                    onClick={() => toggleExpanded(item.id)}
                  >
                    {isOpen ? (
                      <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                    ) : (
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                    )}
                    <div>
                      <p className="font-medium">{item.nombre}</p>
                      <p className="text-sm text-zinc-400">
                        {item.rubro ?? "Sin rubro"}
                        {item.montoMensual != null ? ` · ${formatearMontoArs(item.montoMensual)}/mes` : ""}
                        {item.texto?.trim() ? " · con texto" : " · sin texto"}
                      </p>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <label className="flex items-center gap-1.5 px-1 text-xs text-zinc-400">
                      <input
                        type="checkbox"
                        checked={item.esActivo}
                        onChange={(ev) => void toggleActivo(item, ev.target.checked)}
                      />
                      Activa
                    </label>
                    <Button type="button" variant="secondary" size="sm" disabled={isSaving} onClick={() => startEdit(item)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={deletingId === item.id || isSaving}
                      onClick={() => void eliminar(item)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Eliminar
                    </Button>
                    <span
                      className={
                        alAire
                          ? "rounded-full bg-emerald-600/20 px-2 py-0.5 text-xs font-medium text-emerald-400"
                          : "rounded-full bg-zinc-700/40 px-2 py-0.5 text-xs font-medium text-zinc-400"
                      }
                    >
                      {alAire ? "Al aire" : item.esActivo ? "Sin texto" : "Inactiva"}
                    </span>
                  </div>
                </div>

                {isOpen && item.texto ? (
                  <p className="mt-3 border-t border-zinc-800 pt-3 text-sm text-zinc-400 line-clamp-4">{item.texto}</p>
                ) : null}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export type { PublicidadCliente };

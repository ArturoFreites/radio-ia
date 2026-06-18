"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { formatearBytes } from "@/lib/audio/storageFormat";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StorageBreakdown } from "@/components/almacenamiento/StorageBreakdown";
import type { LimpiarResponse, StorageStatsResponse } from "@/types/storage";

export type StorageActionsProps = {
  initialStats: StorageStatsResponse;
};

type ConfirmBulk = {
  modo: "todo" | "seleccion";
  bytes: number;
  categorias: string[];
} | null;

async function fetchStats(): Promise<StorageStatsResponse> {
  const res = await fetch("/api/storage/stats");
  if (res.status === 401) {
    throw new Error("Sesión expirada");
  }
  if (!res.ok) {
    throw new Error("No se pudieron cargar las estadísticas");
  }
  return (await res.json()) as StorageStatsResponse;
}

async function limpiarCategorias(categorias: string[]): Promise<LimpiarResponse> {
  const res = await fetch("/api/storage/limpiar", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categorias }),
  });
  if (res.status === 401) {
    throw new Error("Sesión expirada");
  }
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "No se pudo limpiar el almacenamiento");
  }
  return (await res.json()) as LimpiarResponse;
}

export function StorageActions({ initialStats }: StorageActionsProps): React.ReactElement {
  const [stats, setStats] = useState<StorageStatsResponse>(initialStats);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState<ConfirmBulk>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const refreshStats = useCallback(async (): Promise<void> => {
    const next = await fetchStats();
    setStats(next);
    setSelected(new Set());
  }, []);

  const ejecutarLimpieza = async (categorias: string[]): Promise<void> => {
    setLoading(true);
    try {
      const resultado = await limpiarCategorias(categorias);
      toast.success(
        `Se eliminaron ${resultado.eliminados} archivos (${formatearBytes(resultado.liberadoBytes)} liberados)`,
      );
      await refreshStats();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al limpiar";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const onDeleteCategory = async (nombre: string): Promise<void> => {
    await ejecutarLimpieza([nombre]);
  };

  const onToggleSelect = (nombre: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(nombre)) {
        next.delete(nombre);
      } else {
        next.add(nombre);
      }
      return next;
    });
  };

  const bytesSeleccionados = stats.categorias
    .filter((c) => selected.has(c.nombre))
    .reduce((acc, c) => acc + c.bytes, 0);

  const confirmarBulk = async (): Promise<void> => {
    if (!confirmBulk) return;
    setBulkDeleting(true);
    try {
      await ejecutarLimpieza(confirmBulk.categorias);
      setConfirmBulk(null);
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Uso total</p>
          <p className="font-mono text-3xl font-bold tabular-nums text-zinc-100">{formatearBytes(stats.totalBytes)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={loading || selected.size === 0}
            onClick={() =>
              setConfirmBulk({
                modo: "seleccion",
                bytes: bytesSeleccionados,
                categorias: [...selected],
              })
            }
            variant="secondary"
          >
            Limpiar selección
          </Button>
          <Button
            disabled={loading || stats.totalBytes === 0}
            onClick={() =>
              setConfirmBulk({
                modo: "todo",
                bytes: stats.totalBytes,
                categorias: [],
              })
            }
            variant="danger"
          >
            Limpiar todo
          </Button>
        </div>
      </Card>

      <StorageBreakdown
        categorias={stats.categorias}
        loading={loading}
        onDeleteCategory={onDeleteCategory}
        onToggleSelect={onToggleSelect}
        selected={selected}
      />

      {confirmBulk ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="storage-bulk-title"
        >
          <Card className="w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold" id="storage-bulk-title">
              {confirmBulk.modo === "todo" ? "Limpiar todo el almacenamiento" : "Limpiar categorías seleccionadas"}
            </h2>
            <p className="text-sm text-zinc-300">
              Se liberarán aproximadamente{" "}
              <span className="font-medium text-zinc-100">{formatearBytes(confirmBulk.bytes)}</span>
              {confirmBulk.modo === "seleccion" ? ` en ${confirmBulk.categorias.length} categoría(s).` : " en todas las categorías."}
            </p>
            <p className="text-xs text-zinc-500">Los previews en uso por bloques activos no se eliminarán.</p>
            <div className="flex justify-end gap-2">
              <Button disabled={bulkDeleting} onClick={() => setConfirmBulk(null)} variant="secondary">
                Cancelar
              </Button>
              <Button disabled={bulkDeleting} loading={bulkDeleting} onClick={() => void confirmarBulk()} variant="danger">
                Confirmar
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

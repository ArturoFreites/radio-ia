"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { etiquetaCategoria, formatearBytes } from "@/lib/audio/storageFormat";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
} from "@/components/ui/Table";
import type { StorageCategoria } from "@/types/storage";

export type StorageBreakdownProps = {
  categorias: StorageCategoria[];
  selected: Set<string>;
  onToggleSelect: (nombre: string) => void;
  onDeleteCategory: (nombre: string) => Promise<void>;
  loading: boolean;
};

type ConfirmState = {
  nombre: string;
  bytes: number;
} | null;

export function StorageBreakdown({
  categorias,
  selected,
  onToggleSelect,
  onDeleteCategory,
  loading,
}: StorageBreakdownProps): React.ReactElement {
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmarEliminar = async (): Promise<void> => {
    if (!confirm) return;
    setDeleting(true);
    try {
      await onDeleteCategory(confirm.nombre);
      setConfirm(null);
    } finally {
      setDeleting(false);
    }
  };

  const vacio = categorias.every((c) => c.archivos === 0);

  if (vacio) {
    return (
      <Card className="py-10 text-center">
        <p className="text-sm text-zinc-400">Sin archivos generados aún</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHead>
            <TableHeaderRow>
              <TableHeaderCell className="w-10">
                <span className="sr-only">Seleccionar</span>
              </TableHeaderCell>
              <TableHeaderCell>Categoría</TableHeaderCell>
              <TableHeaderCell>Archivos</TableHeaderCell>
              <TableHeaderCell>Tamaño</TableHeaderCell>
              <TableHeaderCell>Acción</TableHeaderCell>
            </TableHeaderRow>
          </TableHead>
          <TableBody>
            {categorias.map((categoria) => (
              <TableRow key={categoria.nombre}>
                <TableCell>
                  <input
                    aria-label={`Seleccionar ${etiquetaCategoria(categoria.nombre)}`}
                    checked={selected.has(categoria.nombre)}
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-900"
                    disabled={loading || categoria.archivos === 0}
                    onChange={() => onToggleSelect(categoria.nombre)}
                    type="checkbox"
                  />
                </TableCell>
                <TableCell bold>{etiquetaCategoria(categoria.nombre)}</TableCell>
                <TableCell>{categoria.archivos}</TableCell>
                <TableCell>{formatearBytes(categoria.bytes)}</TableCell>
                <TableCell>
                  <Button
                    disabled={loading || categoria.archivos === 0}
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => setConfirm({ nombre: categoria.nombre, bytes: categoria.bytes })}
                    size="sm"
                    variant="danger"
                  >
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {confirm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="storage-confirm-title"
        >
          <Card className="w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold" id="storage-confirm-title">
              Confirmar eliminación
            </h2>
            <p className="text-sm text-zinc-300">
              Vas a eliminar los archivos de{" "}
              <span className="font-medium text-zinc-100">{etiquetaCategoria(confirm.nombre)}</span> y liberar
              aproximadamente <span className="font-medium text-zinc-100">{formatearBytes(confirm.bytes)}</span>.
            </p>
            <p className="text-xs text-zinc-500">Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-2">
              <Button disabled={deleting} onClick={() => setConfirm(null)} variant="secondary">
                Cancelar
              </Button>
              <Button disabled={deleting} loading={deleting} onClick={() => void confirmarEliminar()} variant="danger">
                Eliminar
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}

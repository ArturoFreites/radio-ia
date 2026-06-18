"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatearMontoArs } from "@/lib/publicidad/format";
import { cn } from "@/lib/utils";
import type { ResumenPagosPublicidad } from "@/types/publicidad";
import type { EstadoPagoPublicidad } from "@prisma/client";

function estadoBadge(estado: EstadoPagoPublicidad): { label: string; className: string } {
  switch (estado) {
    case "PAGADO":
      return { label: "Pagado", className: "bg-emerald-600/20 text-emerald-400" };
    case "PARCIAL":
      return { label: "Parcial", className: "bg-amber-500/15 text-amber-300" };
    default:
      return { label: "Pendiente", className: "bg-zinc-700/40 text-zinc-400" };
  }
}

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

function shiftMes(anio: number, mes: number, delta: number): { anio: number; mes: number } {
  const date = new Date(anio, mes - 1 + delta, 1);
  return { anio: date.getFullYear(), mes: date.getMonth() + 1 };
}

export function PublicidadPagosPanel(): React.ReactElement {
  const now = new Date();
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [resumen, setResumen] = useState<ResumenPagosPublicidad | null>(null);
  const [cargando, setCargando] = useState(true);
  const [accionId, setAccionId] = useState<string | null>(null);

  const cargar = useCallback(async (targetAnio: number, targetMes: number): Promise<void> => {
    setCargando(true);
    try {
      const res = await fetch(`/api/publicidad/pagos?anio=${targetAnio}&mes=${targetMes}`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("No se pudo cargar el resumen de pagos");
      }
      const data = (await res.json()) as ResumenPagosPublicidad;
      setResumen(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar pagos");
      setResumen(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar(anio, mes);
  }, [anio, mes, cargar]);

  const navegarMes = (delta: number): void => {
    const next = shiftMes(anio, mes, delta);
    setAnio(next.anio);
    setMes(next.mes);
  };

  const marcarPagado = async (pagoId: string): Promise<void> => {
    setAccionId(pagoId);
    try {
      const res = await fetch(`/api/publicidad/pagos/${pagoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marcarPagado: true }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(typeof payload?.error === "string" ? payload.error : "No se pudo registrar el pago");
      }
      toast.success("Pago registrado");
      await cargar(anio, mes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al registrar pago");
    } finally {
      setAccionId(null);
    }
  };

  const marcarPendiente = async (pagoId: string): Promise<void> => {
    setAccionId(pagoId);
    try {
      const res = await fetch(`/api/publicidad/pagos/${pagoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marcarPendiente: true }),
      });
      if (!res.ok) {
        throw new Error("No se pudo revertir el pago");
      }
      toast.success("Marcado como pendiente");
      await cargar(anio, mes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar");
    } finally {
      setAccionId(null);
    }
  };

  const totales = resumen?.totales;
  const progresoCobro =
    totales && totales.acordado > 0 ? Math.min(100, Math.round((totales.cobrado / totales.acordado) * 100)) : 0;

  return (
    <div className="space-y-4">
      <div className="rounded border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-400">
        <p>
          Seguimiento de cobros del mes. La <strong className="font-medium text-zinc-200">cuota mensual</strong> se
          define al crear el cliente en el catálogo y es la misma todos los meses. Acá solo marcás si pagó o no.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => navegarMes(-1)} aria-label="Mes anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[10rem] text-center text-lg font-semibold text-zinc-100">
            {resumen?.periodo.etiqueta ?? "..."}
          </h2>
          <Button type="button" variant="ghost" size="sm" onClick={() => navegarMes(1)} aria-label="Mes siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {cargando ? (
          <span className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </span>
        ) : null}
      </div>

      {totales ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Total cuotas</p>
            <p className="mt-1 text-xl font-semibold text-zinc-100">{formatearMontoArs(totales.acordado)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Cobrado</p>
            <p className="mt-1 text-xl font-semibold text-emerald-400">{formatearMontoArs(totales.cobrado)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Pendiente</p>
            <p className="mt-1 text-xl font-semibold text-amber-300">{formatearMontoArs(totales.pendiente)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Clientes al día</p>
            <p className="mt-1 text-xl font-semibold text-zinc-100">
              {totales.pagados} / {totales.totalClientes}
            </p>
            {totales.acordado > 0 ? (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${progresoCobro}%` }}
                />
              </div>
            ) : null}
          </Card>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded border border-zinc-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Cuota mensual</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Fecha pago</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {!resumen || resumen.filas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  {cargando ? "Cargando pagos..." : "No hay clientes activos para este mes."}
                </td>
              </tr>
            ) : (
              resumen.filas.map((fila) => {
                const badge = estadoBadge(fila.estado);
                const busy = accionId === fila.pagoId;
                const sinCuota = fila.montoAcordado == null || fila.montoAcordado <= 0;

                return (
                  <tr key={fila.pagoId} className={cn(!fila.esActivo && "opacity-60")}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-200">{fila.nombre}</p>
                      <p className="text-xs text-zinc-500">{fila.rubro ?? "Sin rubro"}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {sinCuota ? (
                        <span className="text-xs text-amber-400">Sin cuota — definila en Catálogo</span>
                      ) : (
                        formatearMontoArs(fila.montoAcordado)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", badge.className)}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{formatFecha(fila.fechaPago)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {fila.estado !== "PAGADO" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy || sinCuota}
                            onClick={() => void marcarPagado(fila.pagoId)}
                            className="text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
                            title={sinCuota ? "Definí la cuota mensual en el catálogo" : undefined}
                          >
                            {busy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="mr-1 h-4 w-4" />
                                Cobrado
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => void marcarPendiente(fila.pagoId)}
                            className="text-zinc-400 hover:text-zinc-200"
                          >
                            {busy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <RotateCcw className="mr-1 h-4 w-4" />
                                Pendiente
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

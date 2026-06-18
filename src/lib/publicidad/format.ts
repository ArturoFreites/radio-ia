const ARS_FORMAT = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

export function formatearMontoArs(monto: number | null | undefined): string {
  if (monto == null || Number.isNaN(monto)) {
    return "—";
  }
  return ARS_FORMAT.format(monto);
}

export function etiquetaMes(anio: number, mes: number): string {
  const nombre = MESES[mes - 1] ?? String(mes);
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

export function calcularEstadoPago(
  monto: number | null,
  montoAcordado: number | null,
): "PENDIENTE" | "PAGADO" | "PARCIAL" {
  if (monto == null || monto <= 0) {
    return "PENDIENTE";
  }
  if (montoAcordado != null && montoAcordado > 0 && monto < montoAcordado) {
    return "PARCIAL";
  }
  return "PAGADO";
}

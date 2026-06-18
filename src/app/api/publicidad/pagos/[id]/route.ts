import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { calcularEstadoPago } from "@/lib/publicidad/format";
import { getSessionRadioId } from "@/lib/session";

const patchSchema = z.object({
  marcarPagado: z.boolean().optional(),
  marcarPendiente: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const pago = await prisma.publicidadPagoMensual.findUnique({
    where: { id },
    include: { anunciante: { select: { radioId: true, montoMensual: true } } },
  });

  if (!pago || pago.anunciante.radioId !== radioId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = parsed.data;
  const cuotaMensual = pago.anunciante.montoMensual;

  if (body.marcarPagado) {
    if (cuotaMensual == null || cuotaMensual <= 0) {
      return NextResponse.json(
        { error: "El cliente no tiene cuota mensual definida. Configurala en el catálogo." },
        { status: 400 },
      );
    }
  }

  let monto = pago.monto;
  let fechaPago = pago.fechaPago;
  let estado = pago.estado;

  if (body.marcarPagado) {
    monto = cuotaMensual;
    fechaPago = new Date();
    estado = calcularEstadoPago(monto, cuotaMensual);
  } else if (body.marcarPendiente) {
    monto = null;
    fechaPago = null;
    estado = "PENDIENTE";
  }

  const actualizado = await prisma.publicidadPagoMensual.update({
    where: { id },
    data: {
      monto,
      fechaPago,
      estado,
    },
  });

  return NextResponse.json({
    id: actualizado.id,
    monto: actualizado.monto,
    estado: actualizado.estado,
    fechaPago: actualizado.fechaPago?.toISOString() ?? null,
  });
}

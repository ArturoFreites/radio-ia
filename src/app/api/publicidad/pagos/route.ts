import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { etiquetaMes } from "@/lib/publicidad/format";
import { getSessionRadioId } from "@/lib/session";
import type { ResumenPagosPublicidad } from "@/types/publicidad";

const querySchema = z.object({
  anio: z.coerce.number().int().min(2020).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
});

function parsePeriodo(request: NextRequest): { anio: number; mes: number } | null {
  const anioParam = request.nextUrl.searchParams.get("anio");
  const mesParam = request.nextUrl.searchParams.get("mes");
  const now = new Date();

  const parsed = querySchema.safeParse({
    anio: anioParam ?? now.getFullYear(),
    mes: mesParam ?? now.getMonth() + 1,
  });

  return parsed.success ? parsed.data : null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const periodo = parsePeriodo(request);
  if (!periodo) {
    return NextResponse.json({ error: "Periodo inválido" }, { status: 400 });
  }

  const { anio, mes } = periodo;

  const clientesActivos = await prisma.anunciante.findMany({
    where: { radioId, esActivo: true },
    select: { id: true },
  });

  if (clientesActivos.length > 0) {
    await prisma.$transaction(
      clientesActivos.map((cliente) =>
        prisma.publicidadPagoMensual.upsert({
          where: {
            anuncianteId_anio_mes: {
              anuncianteId: cliente.id,
              anio,
              mes,
            },
          },
          create: {
            anuncianteId: cliente.id,
            anio,
            mes,
          },
          update: {},
        }),
      ),
    );
  }

  const clientes = await prisma.anunciante.findMany({
    where: { radioId },
    include: {
      pagosMensuales: {
        where: { anio, mes },
        take: 1,
      },
    },
    orderBy: [{ esActivo: "desc" }, { nombre: "asc" }],
  });

  const filas = clientes
    .filter((cliente) => cliente.esActivo || cliente.pagosMensuales.length > 0)
    .map((cliente) => {
      const pago = cliente.pagosMensuales[0] ?? null;
      return {
        pagoId: pago?.id ?? "",
        anuncianteId: cliente.id,
        nombre: cliente.nombre,
        rubro: cliente.rubro,
        esActivo: cliente.esActivo,
        montoAcordado: cliente.montoMensual,
        monto: pago?.monto ?? null,
        estado: pago?.estado ?? ("PENDIENTE" as const),
        fechaPago: pago?.fechaPago?.toISOString() ?? null,
        notas: pago?.notas ?? null,
      };
    })
    .filter((fila) => fila.pagoId.length > 0);

  let acordado = 0;
  let cobrado = 0;
  let pagados = 0;

  for (const fila of filas) {
    if (fila.montoAcordado != null && fila.montoAcordado > 0) {
      acordado += fila.montoAcordado;
    }
    if (fila.monto != null && fila.monto > 0) {
      cobrado += fila.monto;
    }
    if (fila.estado === "PAGADO") {
      pagados += 1;
    }
  }

  const pendiente = Math.max(0, acordado - cobrado);

  const resumen: ResumenPagosPublicidad = {
    periodo: {
      anio,
      mes,
      etiqueta: etiquetaMes(anio, mes),
    },
    totales: {
      acordado,
      cobrado,
      pendiente,
      pagados,
      totalClientes: filas.length,
    },
    filas,
  };

  return NextResponse.json(resumen);
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { obtenerResumenConsumoApis } from "@/lib/consumo/resumen";
import { getSessionRadioId } from "@/lib/session";
import type { PeriodoConsumo } from "@/types/consumo";

const querySchema = z.object({
  periodo: z.enum(["semana", "mes"]).default("mes"),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const parsed = querySchema.safeParse({
    periodo: request.nextUrl.searchParams.get("periodo") ?? "mes",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetro periodo inválido" }, { status: 400 });
  }

  const periodo: PeriodoConsumo = parsed.data.periodo;
  const resumen = await obtenerResumenConsumoApis(radioId, periodo);
  return NextResponse.json(resumen);
}

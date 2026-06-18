import { NextResponse } from "next/server";
import { z } from "zod";
import { buildUrlAire } from "@/lib/configuracion/urlAire";
import { prisma } from "@/lib/prisma";
import { getSessionRadioId } from "@/lib/session";
import type { ConfiguracionResponse } from "@/types/configuracion";

const patchConfigSchema = z
  .object({
    nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(80).optional(),
    estiloLocucion: z.string().trim().max(500).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  });

async function loadConfiguracion(radioId: string): Promise<ConfiguracionResponse | null> {
  const radio = await prisma.radio.findUnique({
    where: { id: radioId },
    select: {
      nombre: true,
      estiloLocucion: true,
      aireToken: true,
    },
  });
  if (!radio) return null;

  return {
    nombre: radio.nombre,
    estiloLocucion: radio.estiloLocucion,
    aireToken: radio.aireToken,
    urlAire: await buildUrlAire(radio.aireToken),
  };
}

export async function GET(): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const config = await loadConfiguracion(radioId);
  if (!config) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json(config);
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const radioId = await getSessionRadioId();
  if (!radioId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = patchConfigSchema.safeParse(await request.json());
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Datos invalidos" }, { status: 400 });
  }

  const { nombre, estiloLocucion } = parsed.data;
  const data: {
    nombre?: string;
    estiloLocucion?: string | null;
  } = {};

  if (nombre !== undefined) data.nombre = nombre;
  if (estiloLocucion !== undefined) {
    data.estiloLocucion = estiloLocucion.length > 0 ? estiloLocucion : null;
  }

  const updated = await prisma.radio.update({
    where: { id: radioId },
    data,
    select: {
      nombre: true,
      estiloLocucion: true,
      aireToken: true,
    },
  });

  const config: ConfiguracionResponse = {
    nombre: updated.nombre,
    estiloLocucion: updated.estiloLocucion,
    aireToken: updated.aireToken,
    urlAire: await buildUrlAire(updated.aireToken),
  };

  return NextResponse.json(config);
}

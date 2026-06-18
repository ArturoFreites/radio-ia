import { NextRequest, NextResponse } from "next/server";
import { Plan, Rol } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  nombreRadio: z.string().min(2),
  email: z.email(),
  password: z.string().min(8),
  ciudad: z.string().min(2),
  provincia: z.string().min(2),
  nombreAdmin: z.string().min(2),
  plan: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]).default("STARTER"),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const slug = parsed.data.nombreRadio
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const radio = await tx.radio.create({
        data: {
          nombre: parsed.data.nombreRadio,
          slug,
          ciudad: parsed.data.ciudad,
          provincia: parsed.data.provincia,
          plan: parsed.data.plan as Plan,
          fuentesNoticias: [],
        },
      });
      await tx.usuario.create({
        data: {
          email: parsed.data.email,
          password: hashedPassword,
          nombre: parsed.data.nombreAdmin,
          rol: Rol.ADMIN,
          radioId: radio.id,
        },
      });
      return radio;
    });

    return NextResponse.json({ ok: true, radioId: result.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo registrar la radio." }, { status: 500 });
  }
}

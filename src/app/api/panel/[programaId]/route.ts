import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programaId: string }> },
): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 401 });
  const { programaId } = await params;
  const programa = await prisma.programa.findFirst({
    where: { id: programaId, panelToken: token },
    include: { bloques: { orderBy: { orden: "asc" } } },
  });
  if (!programa) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(programa);
}

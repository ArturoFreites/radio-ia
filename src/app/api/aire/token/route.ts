import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse<{ radioId: string } | { error: string }>> {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token requerido" }, { status: 400 });
  }
  const radio = await prisma.radio.findUnique({
    where: { aireToken: token },
    select: { id: true },
  });
  if (!radio) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ radioId: radio.id });
}

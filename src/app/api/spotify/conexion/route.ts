import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await prisma.spotifyConexion.deleteMany({
    where: { radioId: session.user.radioId },
  });

  return NextResponse.json({ ok: true });
}

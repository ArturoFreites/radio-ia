import { NextResponse } from "next/server";
import { obtenerStorageStats } from "@/lib/audio/storageGestion";
import { getSessionRadioId } from "@/lib/session";
import type { StorageStatsResponse } from "@/types/storage";

export async function GET(): Promise<NextResponse<StorageStatsResponse | { error: string }>> {
  const radioId = await getSessionRadioId();
  if (!radioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const stats = await obtenerStorageStats(radioId);
  return NextResponse.json(stats);
}

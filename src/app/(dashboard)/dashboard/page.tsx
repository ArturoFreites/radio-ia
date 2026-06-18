import { getServerSession } from "next-auth";
import { ConsumoApisPanel } from "@/components/dashboard/ConsumoApisPanel";
import { DashboardBroadcastPanel } from "@/components/dashboard/DashboardBroadcastPanel";
import { DashboardInterrupcionesRow } from "@/components/dashboard/DashboardInterrupcionesRow";
import { DashboardKpiSection } from "@/components/dashboard/DashboardKpiSection";
import {
  buildDashboardSlotItems,
} from "@/lib/dashboard/slotItems";
import { DashboardSlotsPanel } from "@/components/dashboard/DashboardSlotsPanel";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { CuotaElevenLabsAlerta } from "@/components/dashboard/CuotaElevenLabsAlerta";
import { authOptions } from "@/lib/auth";
import { formatearUsd } from "@/lib/consumo/constants";
import { obtenerResumenConsumoApis } from "@/lib/consumo/resumen";
import {
  formatearAlmacenamientoConLimite,
} from "@/lib/dashboard/metrics";
import {
  elegirSlotActivo,
  mergeSlotsDelDiaArgentina,
} from "@/lib/grilla/mergeDia";
import { djConfigFromRow } from "@/lib/grilla/djConfigSchema";
import {
  horaFinDesdeInicioYDuracion,
  horaStringAMinutos,
  minutosDelDiaActualArgentina,
} from "@/lib/grilla/tiempo";
import { getUmbralAlerta } from "@/lib/elevenlabs/quota";
import { obtenerStorageStats } from "@/lib/audio/storageGestion";
import { prisma } from "@/lib/prisma";

async function obtenerStreamOnline(aireToken: string | null | undefined): Promise<boolean> {
  if (!aireToken) return false;
  try {
    const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/aire/estado?token=${encodeURIComponent(aireToken)}`, {
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { spotifySesion?: unknown; ahora?: unknown };
    return Boolean(data.spotifySesion ?? data.ahora);
  } catch {
    return false;
  }
}

export default async function DashboardPage(): Promise<React.ReactElement> {
  const session = await getServerSession(authOptions);
  const radioId = session?.user?.radioId ?? "";
  const ahora = new Date();

  const [radio, slotsSemanales, eventos, storageStats, spotifyConexion, publicidades, consumoMes] =
    await Promise.all([
      radioId
        ? prisma.radio.findUnique({
            where: { id: radioId },
            select: { aireToken: true, nombre: true, ciudad: true },
          })
        : null,
      radioId
        ? prisma.slotGrilla.findMany({
            where: { radioId },
            include: {
              voz1: { select: { geminiVoiceId: true, nombre: true } },
              voz2: { select: { geminiVoiceId: true, nombre: true } },
            },
          })
        : [],
      radioId
        ? prisma.eventoGrilla.findMany({
            where: { radioId },
            include: {
              voz1: { select: { geminiVoiceId: true, nombre: true } },
              voz2: { select: { geminiVoiceId: true, nombre: true } },
            },
          })
        : [],
      radioId ? obtenerStorageStats(radioId) : Promise.resolve({ totalBytes: 0, categorias: [] }),
      radioId
        ? prisma.spotifyConexion.findUnique({ where: { radioId }, select: { id: true } })
        : null,
      radioId
        ? prisma.anunciante.findMany({
            where: { radioId, esActivo: true },
            select: { id: true, nombre: true, texto: true, audioUrl: true },
            take: 4,
          })
        : [],
      radioId ? obtenerResumenConsumoApis(radioId, "mes", ahora) : null,
    ]);

  const streamOnline = await obtenerStreamOnline(radio?.aireToken);

  const slots = mergeSlotsDelDiaArgentina(ahora, slotsSemanales, eventos);
  const ayer = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
  const slotsAyer = mergeSlotsDelDiaArgentina(ayer, slotsSemanales, eventos);
  const activo = elegirSlotActivo(slots, ahora);
  const nowMin = minutosDelDiaActualArgentina(ahora);
  const slotsCompletados = slots.filter((slot) => {
    const startMin = horaStringAMinutos(slot.horaInicio);
    return startMin + slot.duracionMin <= nowMin && slot.id !== activo?.id;
  }).length;

  const diffSlotsAyer = slots.length - slotsAyer.length;
  const slotsHint =
    diffSlotsAyer === 0
      ? "Igual que ayer"
      : `${diffSlotsAyer > 0 ? "+" : ""}${diffSlotsAyer} vs ayer`;

  const geminiCostoMes = formatearUsd(consumoMes?.gemini.costoEstimadoUsd ?? 0);
  const geminiHint = consumoMes
    ? `${consumoMes.gemini.llamadas} llamadas · mes actual`
    : "Sin registros aún";

  const almacenamiento = formatearAlmacenamientoConLimite(storageStats.totalBytes);
  const slotItems = buildDashboardSlotItems(slots, activo?.id ?? null, ahora);
  const djConfig = activo
    ? djConfigFromRow(activo)
    : slots[0]
      ? djConfigFromRow(slots[0])
      : null;

  const publicidadesDashboard = publicidades
    .filter((item) => item.texto?.trim() || item.audioUrl)
    .map((item) => ({
      id: item.id,
      nombre: item.nombre,
    }));

  return (
    <main className="space-y-8">
      <DashboardTopbar
        aireToken={radio?.aireToken ?? null}
        radioNombre={radio?.nombre ?? "Radio"}
        usuarioNombre={session?.user?.nombre ?? session?.user?.email ?? "Usuario"}
      />

      <CuotaElevenLabsAlerta umbralAlerta={getUmbralAlerta()} />

      <DashboardKpiSection
        almacenamientoPorcentaje={almacenamiento.porcentaje}
        almacenamientoTexto={almacenamiento.texto}
        geminiCostoMes={geminiCostoMes}
        geminiHint={geminiHint}
        slotActivoFin={
          activo
            ? horaFinDesdeInicioYDuracion(activo.horaInicio, activo.duracionMin)
            : null
        }
        slotActivoInicio={activo?.horaInicio ?? null}
        slotsCompletados={slotsCompletados}
        slotsHint={slotsHint}
        slotsHoy={slots.length}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <DashboardSlotsPanel slots={slotItems} />
        <DashboardBroadcastPanel
          djConfig={djConfig}
          enVivo={Boolean(activo)}
          radioCiudad={radio?.ciudad ?? undefined}
          spotifyConectado={Boolean(spotifyConexion)}
          streamOnline={streamOnline}
        />
      </div>

      <DashboardInterrupcionesRow
        publicidades={publicidadesDashboard}
        djConfig={djConfig}
        radioCiudad={radio?.ciudad ?? undefined}
      />

      <ConsumoApisPanel />
    </main>
  );
}

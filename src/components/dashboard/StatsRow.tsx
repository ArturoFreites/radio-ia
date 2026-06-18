import { CalendarDays, HardDrive, Users } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { StatCard } from "@/components/ui/StatCard";

export type StatsRowProps = {
  slotsHoy: number;
  slotsAyer: number;
  almacenamientoTexto: string;
  almacenamientoPorcentaje: number;
  elevenlabsPorcentaje?: number | null;
  elevenlabsRenuevaDias?: number | null;
  geminiCostoHoy: string;
};

function tendenciaSlots(hoy: number, ayer: number): string | undefined {
  const diff = hoy - ayer;
  if (diff === 0) {
    return "igual que ayer";
  }
  const signo = diff > 0 ? "+" : "";
  return `${signo}${diff} vs ayer`;
}

export function StatsRow({
  slotsHoy,
  slotsAyer,
  almacenamientoTexto,
  almacenamientoPorcentaje,
  elevenlabsPorcentaje,
  elevenlabsRenuevaDias,
  geminiCostoHoy,
}: StatsRowProps): React.ReactElement {
  const tendencia = tendenciaSlots(slotsHoy, slotsAyer);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <StatCard
        hint={tendencia}
        icon={<CalendarDays className="h-5 w-5" />}
        label="Slots hoy"
        value={slotsHoy}
      />
      <StatCard
        action={{ label: "Gestionar →", href: "/almacenamiento" }}
        icon={<HardDrive className="h-5 w-5" />}
        label="Almacenamiento"
        progress={almacenamientoPorcentaje}
        progressLabel={almacenamientoTexto}
        value={almacenamientoTexto.split(" / ")[0] ?? almacenamientoTexto}
      />
      <StatCard
        accent={(elevenlabsPorcentaje ?? 0) >= 75}
        icon={<BrandLogo brand="elevenlabs" padded size="md" />}
        label="ElevenLabs"
        progress={elevenlabsPorcentaje ?? undefined}
        progressLabel={
          elevenlabsRenuevaDias !== null && elevenlabsRenuevaDias !== undefined
            ? `Renueva en ${elevenlabsRenuevaDias} días`
            : "Cuota mensual"
        }
        value={elevenlabsPorcentaje !== null && elevenlabsPorcentaje !== undefined ? `${elevenlabsPorcentaje}%` : "—"}
      />
      <StatCard
        icon={<BrandLogo brand="gemini" size="md" />}
        label="Gemini API"
        progressLabel="costo estimado hoy"
        value={geminiCostoHoy}
      />
      <StatCard
        icon={<Users className="h-5 w-5" />}
        label="Oyentes"
        progressLabel="sin datos de streaming"
        value="—"
      />
    </div>
  );
}

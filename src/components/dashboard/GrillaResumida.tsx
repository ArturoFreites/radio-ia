import Link from "next/link";
import { ScheduleTimeline, type ScheduleTimelineItem } from "@/components/airon/ScheduleTimeline";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";

export type GrillaResumidaProps = {
  fechaLabel: string;
  items: ScheduleTimelineItem[];
};

export function GrillaResumida({ fechaLabel, items }: GrillaResumidaProps): React.ReactElement {
  return (
    <Card className="sticky top-6 p-4">
      <SectionHeader
        action={
          <Link
            className="text-xs font-medium text-[color:var(--primary)] hover:brightness-110"
            href="/grilla"
          >
            Ver grilla
          </Link>
        }
        title={`Hoy — ${fechaLabel}`}
      />
      <ScheduleTimeline items={items} />
      {items.length > 0 ? (
        <Link
          className="mt-3 block text-center text-xs font-medium text-[color:var(--primary)] hover:brightness-110"
          href="/grilla"
        >
          Abrir grilla completa →
        </Link>
      ) : null}
    </Card>
  );
}

import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableHeaderRow, TableRow } from "@/components/ui/Table";

export type ProximosSlotsProps = {
  slots: Array<{
    id: string;
    nombre: string;
    horaInicio: string;
    horaFin: string;
    estado: string;
  }>;
};

function badgePorEstado(estado: string): BadgeVariant {
  if (estado === "COMPLETADO") {
    return "ready";
  }
  if (estado === "BORRADOR") {
    return "draft";
  }
  if (estado === "DJ") {
    return "warning";
  }
  return "offline";
}

export function ProximosSlots({ slots }: ProximosSlotsProps): React.ReactElement {
  return (
    <Card>
      <SectionHeader title="Próximos en la grilla" />
      {slots.length === 0 ? (
        <p className="text-sm text-zinc-500">No hay más slots hoy</p>
      ) : (
        <Table>
          <TableHead>
            <TableHeaderRow>
              <TableHeaderCell>Slot DJ</TableHeaderCell>
              <TableHeaderCell>Horario</TableHeaderCell>
              <TableHeaderCell className="text-right">Estado</TableHeaderCell>
            </TableHeaderRow>
          </TableHead>
          <TableBody>
            {slots.map((slot) => (
              <TableRow key={slot.id}>
                <TableCell bold>{slot.nombre}</TableCell>
                <TableCell className="font-mono tabular-nums text-zinc-400">
                  {slot.horaInicio} – {slot.horaFin}
                </TableCell>
                <TableCell className="text-right">
                  <Badge label={slot.estado} variant={badgePorEstado(slot.estado)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

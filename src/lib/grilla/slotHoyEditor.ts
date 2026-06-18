import type { SlotFormTarget } from "@/components/grilla/SlotForm";
import type { GrillaEditorEventoRow, GrillaEditorSlotRow, SlotHoy } from "@/types/grilla";

export function idRealSlotHoy(slot: SlotHoy): string {
  if (slot.origen === "slot") {
    return slot.id.startsWith("slot_") ? slot.id.slice(5) : slot.id;
  }
  return slot.id.startsWith("evt_") ? slot.id.slice(4) : slot.id;
}

export function targetEdicionDesdeSlotHoy(
  slot: SlotHoy,
  slots: GrillaEditorSlotRow[],
  eventos: GrillaEditorEventoRow[],
): SlotFormTarget | null {
  const id = idRealSlotHoy(slot);
  if (slot.origen === "slot") {
    const row = slots.find((s) => s.id === id);
    return row ? { kind: "editar-slot", slot: row } : null;
  }
  const row = eventos.find((e) => e.id === id);
  return row ? { kind: "editar-evento", evento: row } : null;
}

export function urlEliminarSlotHoy(slot: SlotHoy): string {
  const id = idRealSlotHoy(slot);
  return slot.origen === "slot" ? `/api/grilla/slots/${id}` : `/api/grilla/eventos/${id}`;
}

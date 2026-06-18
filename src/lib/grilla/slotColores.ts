import type { GrillaEditorSlotRow } from "@/types/grilla";

export type SlotColorVariant = "dj" | "presentacion" | "musical" | "evento" | "interrupciones";

type SlotColorInput = Pick<
  GrillaEditorSlotRow,
  | "playlistNombre"
  | "voz1"
  | "presentacionCadaTemas"
  | "djHoraActiva"
  | "djClimaActivo"
  | "djPublicidadActiva"
>;

export function variantColorSlot(slot: SlotColorInput): SlotColorVariant {
  const interrupcionesActivas =
    slot.djHoraActiva || slot.djClimaActivo || slot.djPublicidadActiva;
  if (interrupcionesActivas && !slot.playlistNombre) return "interrupciones";
  if (slot.voz1 && slot.presentacionCadaTemas > 0) return "presentacion";
  if (slot.playlistNombre) return "dj";
  return "musical";
}

export const SLOT_COLOR_CLASSES: Record<
  SlotColorVariant,
  { block: string; dot: string; label: string }
> = {
  dj: {
    block: "border-[color:var(--primary)]/45 bg-[color:var(--primary)]/12 text-[color:var(--text)]",
    dot: "bg-[color:var(--primary)]",
    label: "DJ en vivo",
  },
  presentacion: {
    block: "border-[color:var(--accent-tertiary)]/45 bg-[color:var(--accent-tertiary)]/10 text-[color:var(--text)]",
    dot: "bg-[color:var(--accent-tertiary)]",
    label: "Presentación IA",
  },
  musical: {
    block: "border-[color:var(--purple)]/45 bg-[color:var(--purple)]/12 text-[color:var(--text)]",
    dot: "bg-[color:var(--purple)]",
    label: "Bloque musical",
  },
  evento: {
    block: "border-[color:var(--danger)]/45 bg-[color:var(--danger)]/10 text-[color:var(--text)]",
    dot: "bg-[color:var(--danger)]",
    label: "Evento puntual",
  },
  interrupciones: {
    block: "border-[color:var(--warning)]/45 bg-[color:var(--warning)]/10 text-[color:var(--text)]",
    dot: "bg-[color:var(--warning)]",
    label: "Interrupciones",
  },
};

export function clasesBloqueSlot(slot: SlotColorInput): string {
  return SLOT_COLOR_CLASSES[variantColorSlot(slot)].block;
}

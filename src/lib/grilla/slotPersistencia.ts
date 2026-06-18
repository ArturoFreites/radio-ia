import type { SlotFormTarget } from "@/components/grilla/SlotForm";

export type ModoSlotGrilla = "semanal" | "evento";

/** Decide si persistir en slots semanales o en eventos puntuales según el tipo elegido. */
export function usarApiSlotsSemanal(target: SlotFormTarget, modo: ModoSlotGrilla): boolean {
  if (target.kind === "editar-slot") return true;
  if (target.kind === "editar-evento") return false;
  return modo === "semanal";
}

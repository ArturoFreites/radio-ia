"use client";

import type { SlotHoy } from "@/types/grilla";
import { horaStringAMinutos, minutosDelDiaActualArgentina } from "@/lib/grilla/tiempo";

function etiquetaSlot(slot: SlotHoy, ahoraId: string | null, siguienteId: string | null): string {
  const partes = [slot.playlistNombre ?? "Modo DJ"];
  if (ahoraId === slot.id) partes.push("activo ahora");
  else if (siguienteId === slot.id) partes.push("siguiente");
  return partes.join(" · ");
}

function esSlotPasado(slot: SlotHoy, nowMin: number): boolean {
  const startMin = horaStringAMinutos(slot.horaInicio);
  return startMin + slot.duracionMin <= nowMin;
}

type GrillaHoyProps = {
  slots: SlotHoy[];
  slotActivoId: string | null;
  slotSiguienteId: string | null;
  onClose: () => void;
  modoBottomSheet?: boolean;
};

function GrillaHoyContent({
  slots,
  slotActivoId,
  slotSiguienteId,
  onClose,
}: Omit<GrillaHoyProps, "modoBottomSheet">): React.ReactElement {
  const nowMin = minutosDelDiaActualArgentina(new Date());

  return (
    <>
      <div className="flex items-center justify-between border-b border-[#1e1e1e] px-4 py-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]">Próximos slots</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        >
          Cerrar
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto p-2 text-sm">
        {slots.map((s) => {
          const activo = slotActivoId === s.id;
          const siguiente = slotSiguienteId === s.id;
          const pasado = !activo && !siguiente && esSlotPasado(s, nowMin);

          let clase = "mb-2 rounded border px-2 py-2 ";
          if (activo) {
            clase += "border-red-600/60 bg-red-950/20";
          } else if (siguiente) {
            clase += "border-dashed border-amber-500/70 bg-amber-950/10";
          } else {
            clase += "border-zinc-800 bg-black/40";
          }
          if (pasado) {
            clase += " opacity-45";
          }

          return (
            <li key={s.id} className={clase}>
              <p className="font-mono text-xs text-amber-500/90">{s.horaInicio}</p>
              <p className="mt-1 leading-snug text-zinc-100">{etiquetaSlot(s, slotActivoId, slotSiguienteId)}</p>
            </li>
          );
        })}
        {slots.length === 0 ? <li className="px-2 py-4 text-center text-zinc-500">Sin slots</li> : null}
      </ul>
    </>
  );
}

export function GrillaHoy({
  slots,
  slotActivoId,
  slotSiguienteId,
  onClose,
  modoBottomSheet = false,
}: GrillaHoyProps): React.ReactElement {
  if (modoBottomSheet) {
    return (
      <>
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50"
          aria-label="Cerrar grilla"
          onClick={onClose}
        />
        <aside className="fixed inset-x-0 bottom-0 z-30 flex max-h-[75vh] flex-col rounded-t-[var(--r-xl)] border-t border-[#1e1e1e] bg-[#0d0d0d] text-zinc-200 shadow-2xl">
          <GrillaHoyContent
            slots={slots}
            slotActivoId={slotActivoId}
            slotSiguienteId={slotSiguienteId}
            onClose={onClose}
          />
        </aside>
      </>
    );
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950/95 text-zinc-200">
      <GrillaHoyContent
        slots={slots}
        slotActivoId={slotActivoId}
        slotSiguienteId={slotSiguienteId}
        onClose={onClose}
      />
    </aside>
  );
}

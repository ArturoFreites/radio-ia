"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SlotForm, type SlotFormTarget } from "@/components/grilla/SlotForm";
import { cn } from "@/lib/utils";

type SlotPopoverProps = {
  open: boolean;
  anchorRect: DOMRect | null;
  target: SlotFormTarget | null;
  onClose: () => void;
  onHecho: () => Promise<void>;
};

function slotFormTargetKey(t: SlotFormTarget): string {
  switch (t.kind) {
    case "nuevo-semanal":
      return `ns-${t.defaults.diaDeSemana}-${t.defaults.horaInicio}-${t.defaults.duracionMin}`;
    case "nuevo-evento":
      return `ne-${t.defaults?.fecha ?? "x"}-${t.defaults?.horaInicio ?? ""}-${t.defaults?.duracionMin ?? ""}`;
    case "editar-slot":
      return `es-${t.slot.id}`;
    case "editar-evento":
      return `ee-${t.evento.id}`;
  }
}

const DESKTOP_MIN_WIDTH_PX = 768;

function useIsDesktopPopover(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`);
    const sync = (): void => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isDesktop;
}

export function SlotPopover({
  open,
  anchorRect,
  target,
  onClose,
  onHecho,
}: SlotPopoverProps): React.ReactElement | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const isDesktop = useIsDesktopPopover();

  const updateDesktopPosition = useCallback((): void => {
    if (!anchorRect || typeof window === "undefined") return;
    if (window.innerWidth < DESKTOP_MIN_WIDTH_PX) return;

    const margin = 8;
    const w = Math.min(380, window.innerWidth - margin * 2);
    let left = anchorRect.left;
    let top = anchorRect.bottom + margin;

    if (left + w > window.innerWidth - margin) {
      left = window.innerWidth - w - margin;
    }
    if (left < margin) left = margin;

    const maxPanelHeight = window.innerHeight - margin * 2;
    const h = Math.min(panelRef.current?.offsetHeight ?? 420, maxPanelHeight);
    if (top + h > window.innerHeight - margin) {
      top = Math.max(margin, anchorRect.top - h - margin);
    }
    if (top < margin) top = margin;

    setPos({ top, left });
  }, [anchorRect]);

  useLayoutEffect(() => {
    if (!open || !anchorRect) return;
    updateDesktopPosition();
  }, [open, anchorRect, target, updateDesktopPosition]);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (!panel) return;

    const ro = new ResizeObserver(() => updateDesktopPosition());
    ro.observe(panel);
    window.addEventListener("resize", updateDesktopPosition);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateDesktopPosition);
    };
  }, [open, updateDesktopPosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !isDesktop) return;
    let remove: (() => void) | null = null;
    const t = window.setTimeout(() => {
      const onDown = (e: MouseEvent): void => {
        if (panelRef.current?.contains(e.target as Node)) return;
        onClose();
      };
      window.addEventListener("mousedown", onDown);
      remove = () => window.removeEventListener("mousedown", onDown);
    }, 160);
    return () => {
      window.clearTimeout(t);
      remove?.();
    };
  }, [open, onClose, isDesktop]);

  useEffect(() => {
    if (!open || isDesktop) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isDesktop]);

  if (!open || !target || !anchorRect) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/60 md:pointer-events-none md:bg-transparent"
        aria-label="Cerrar formulario"
        onClick={() => onClose()}
      />
      <div
        ref={panelRef}
        style={isDesktop ? { top: pos.top, left: pos.left } : undefined}
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed z-50 flex max-h-[min(90dvh,100dvh-8px)] w-full flex-col overflow-hidden border border-[#2a2a2a] bg-zinc-900 shadow-[var(--shadow-dropdown)]",
          isDesktop
            ? "w-[min(380px,calc(100vw-16px))] rounded-[var(--r-lg)]"
            : "inset-x-0 bottom-0 rounded-t-[var(--r-lg)]",
        )}
      >
        {!isDesktop ? (
          <div className="flex shrink-0 justify-center pt-2 pb-1" aria-hidden>
            <div className="h-1 w-10 rounded-full bg-zinc-700" />
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-1 md:pt-3">
          <SlotForm
            key={`${slotFormTargetKey(target)}-${Math.round(anchorRect.top)}-${Math.round(anchorRect.left)}`}
            target={target}
            onCancel={onClose}
            onSuccess={async () => {
              await onHecho();
              onClose();
            }}
          />
        </div>
      </div>
    </>
  );
}

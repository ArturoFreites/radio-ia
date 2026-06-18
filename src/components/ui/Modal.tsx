"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmVariant?: "primary" | "danger";
  loading?: boolean;
  fullscreenMobile?: boolean;
  className?: string;
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  confirmVariant = "primary",
  loading = false,
  fullscreenMobile = false,
  className,
}: ModalProps): React.ReactElement {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4">
          <motion.button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="airon-modal-title"
            initial={{ opacity: 0, y: fullscreenMobile ? 40 : 16, scale: fullscreenMobile ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: fullscreenMobile ? 40 : 16, scale: fullscreenMobile ? 1 : 0.98 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "relative z-10 flex w-full flex-col border border-[color:var(--border)] bg-[color:var(--surface-soft)] shadow-[var(--shadow-dropdown)]",
              fullscreenMobile
                ? "h-full max-h-full rounded-none md:h-auto md:max-w-lg md:rounded-2xl"
                : "max-h-[90vh] max-w-lg overflow-hidden rounded-t-2xl md:rounded-2xl",
              className,
            )}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
              <div>
                <h2 id="airon-modal-title" className="text-lg font-semibold text-[color:var(--text)]">
                  {title}
                </h2>
                {description ? (
                  <p className="mt-1 text-sm text-[color:var(--muted)]">{description}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                className="rounded-xl p-2 text-[color:var(--muted)] transition hover:bg-[color:var(--surface)] hover:text-[color:var(--text)]"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {children ? <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div> : null}
            {onConfirm ? (
              <div className="flex gap-3 border-t border-[color:var(--border)] px-5 py-4">
                <Button className="flex-1" variant="ghost" onClick={onClose} disabled={loading}>
                  {cancelLabel}
                </Button>
                <Button
                  className="flex-1"
                  variant={confirmVariant}
                  loading={loading}
                  onClick={onConfirm}
                >
                  {confirmLabel}
                </Button>
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

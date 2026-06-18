"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type SlotWizardStep = "playlist" | "voz" | "interrupciones";

export type SlotWizardProps = {
  step: SlotWizardStep;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
};

const steps: Array<{ id: SlotWizardStep; label: string }> = [
  { id: "playlist", label: "Playlist" },
  { id: "voz", label: "Voz" },
  { id: "interrupciones", label: "Interrupciones" },
];

export function SlotWizard({
  step,
  onBack,
  onNext,
  nextLabel = "Siguiente",
  backLabel = "Atrás",
  nextDisabled = false,
  loading = false,
  children,
  className,
}: SlotWizardProps): React.ReactElement {
  const currentIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className={cn("flex min-h-0 flex-col py-4", className)}>
      <div className="mb-4 px-0">
        <ol className="flex items-center gap-1 sm:gap-2">
          {steps.map((item, index) => {
            const done = index < currentIndex;
            const active = index === currentIndex;
            return (
              <li key={item.id} className="flex flex-1 items-center gap-1 sm:gap-2">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:h-8 sm:w-8",
                    done || active
                      ? "bg-[color:var(--primary)] text-[color:var(--primary-foreground)]"
                      : "bg-[color:var(--surface-2)] text-[color:var(--muted)]",
                  )}
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    "truncate text-xs font-medium sm:text-sm",
                    active ? "text-[color:var(--text)]" : "text-[color:var(--muted)]",
                  )}
                >
                  {item.label}
                </span>
                {index < steps.length - 1 ? (
                  <span
                    aria-hidden
                    className={cn(
                      "hidden h-px flex-1 sm:block",
                      done ? "bg-[color:var(--primary)]" : "bg-[color:var(--border)]",
                    )}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="min-h-0 flex-1">{children}</div>

      <div className="sticky bottom-0 mt-4 border-t border-[color:var(--border)] bg-[color:var(--background)]/95 pt-4 backdrop-blur-md">
        <div className="flex gap-3">
          {onBack ? (
            <Button className="flex-1" variant="ghost" onClick={onBack}>
              {backLabel}
            </Button>
          ) : null}
          {onNext ? (
            <Button
              className="flex-1"
              disabled={nextDisabled}
              loading={loading}
              onClick={onNext}
              size="lg"
            >
              {nextLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

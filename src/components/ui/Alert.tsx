import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertType = "info" | "success" | "warning" | "error";

export type AlertProps = {
  type: AlertType;
  title: string;
  description?: string;
  onDismiss?: () => void;
  className?: string;
};

const styles: Record<AlertType, { container: string; icon: React.ReactNode }> = {
  info: {
    container: "border-[color:var(--cyan)]/30 bg-[color:var(--cyan)]/10 text-[color:var(--text)]",
    icon: <Info className="h-5 w-5 text-[color:var(--cyan)]" aria-hidden />,
  },
  success: {
    container: "border-[color:var(--success)]/30 bg-[color:var(--success)]/10 text-[color:var(--text)]",
    icon: <CheckCircle2 className="h-5 w-5 text-[color:var(--success)]" aria-hidden />,
  },
  warning: {
    container: "border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 text-[color:var(--text)]",
    icon: <AlertTriangle className="h-5 w-5 text-[color:var(--warning)]" aria-hidden />,
  },
  error: {
    container: "border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 text-[color:var(--text)]",
    icon: <AlertCircle className="h-5 w-5 text-[color:var(--danger)]" aria-hidden />,
  },
};

export function Alert({ type, title, description, onDismiss, className }: AlertProps): React.ReactElement {
  const style = styles[type];

  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3",
        style.container,
        className,
      )}
    >
      <div className="shrink-0 pt-0.5">{style.icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {description ? <p className="mt-1 text-sm text-[color:var(--muted)]">{description}</p> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          aria-label="Cerrar alerta"
          className="shrink-0 rounded-lg p-1 text-[color:var(--muted)] transition hover:bg-black/10 hover:text-[color:var(--text)]"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

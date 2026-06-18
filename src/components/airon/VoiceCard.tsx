import { Mic2, Play } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export type VoiceCardProps = {
  alias: string;
  nombreAlAire?: string;
  personalidad?: string;
  avatarUrl?: string;
  selected?: boolean;
  previewAvailable?: boolean;
  error?: string | null;
  onSelect?: () => void;
  onPreview?: () => void;
  className?: string;
};

export function VoiceCard({
  alias,
  nombreAlAire,
  personalidad,
  avatarUrl,
  selected = false,
  previewAvailable = true,
  error = null,
  onSelect,
  onPreview,
  className,
}: VoiceCardProps): React.ReactElement {
  return (
    <Card
      interactive
      className={cn(
        "space-y-4 p-4",
        selected ? "border-[color:var(--primary)] ring-1 ring-[color:var(--primary)]/40" : undefined,
        className,
      )}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[color:var(--surface-2)]">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[color:var(--cyan)]">
              <Mic2 className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-[color:var(--text)]">{alias}</h3>
            {selected ? <Badge label="Seleccionada" variant="ready" showDot={false} /> : null}
          </div>
          {nombreAlAire ? (
            <p className="mt-1 text-sm text-[color:var(--muted)]">Al aire: {nombreAlAire}</p>
          ) : null}
          {personalidad ? (
            <p className="mt-2 text-sm text-[color:var(--muted)]">{personalidad}</p>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-xs text-[color:var(--danger)]">{error}</p> : null}

      {onPreview ? (
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          disabled={!previewAvailable}
          iconLeft={<Play className="h-3.5 w-3.5" />}
          onClick={(event) => {
            event.stopPropagation();
            onPreview();
          }}
        >
          {previewAvailable ? "Escuchar" : "Sin preview"}
        </Button>
      ) : null}
    </Card>
  );
}

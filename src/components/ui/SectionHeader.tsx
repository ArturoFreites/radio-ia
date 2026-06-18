import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">{title}</h2>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

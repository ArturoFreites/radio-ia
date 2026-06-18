import { cn } from "@/lib/utils";

export type AironMarkProps = {
  className?: string;
};

export function AironMark({ className }: AironMarkProps): React.ReactElement {
  return (
    <svg
      aria-hidden
      className={cn("h-[18px] w-[18px] shrink-0 text-[color:var(--primary)]", className)}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 2.5 21.25 21h-4.35l-1.55-3.35H8.65L7.1 21H2.75L12 2.5zm0 5.2-2.85 6.15h5.7L12 7.7z" />
    </svg>
  );
}

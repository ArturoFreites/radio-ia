import { cn } from "@/lib/utils";

export function Table({ children, className }: { children: React.ReactNode; className?: string }): React.ReactElement {
  return <div className={cn("overflow-x-auto", className)}><table className="min-w-full">{children}</table></div>;
}

export function TableHead({ children }: { children: React.ReactNode }): React.ReactElement {
  return <thead>{children}</thead>;
}

export function TableHeaderRow({ children }: { children: React.ReactNode }): React.ReactElement {
  return <tr>{children}</tr>;
}

export function TableHeaderCell({ children, className }: { children: React.ReactNode; className?: string }): React.ReactElement {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500",
        "text-[11px]",
        className,
      )}
      scope="col"
    >
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: React.ReactNode }): React.ReactElement {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children, className }: { children: React.ReactNode; className?: string }): React.ReactElement {
  return (
    <tr className={cn("border-b border-[#1e1e1e] transition hover:bg-[#161616]", className)}>
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  className,
  bold = false,
}: {
  children: React.ReactNode;
  className?: string;
  bold?: boolean;
}): React.ReactElement {
  return <td className={cn("px-4 py-3 text-sm text-zinc-200", bold ? "font-medium text-zinc-100" : "font-normal", className)}>{children}</td>;
}

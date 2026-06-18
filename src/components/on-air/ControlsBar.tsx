"use client";

import {
  CalendarDays,
  Megaphone,
  Mic,
  MoreHorizontal,
  Radio,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ControlsBarProps = {
  onSilence?: () => void;
  onForceInterruption?: () => void;
  onDemoAd?: () => void;
  onViewSchedule?: () => void;
  onMore?: () => void;
  centerActive?: boolean;
  className?: string;
};

type ControlAction = {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  highlight?: boolean;
};

export function ControlsBar({
  onSilence,
  onForceInterruption,
  onDemoAd,
  onViewSchedule,
  onMore,
  centerActive = true,
  className,
}: ControlsBarProps): React.ReactElement {
  const actions: ControlAction[] = [
    { label: "Silencio", icon: <VolumeX className="h-5 w-5" />, onClick: onSilence },
    { label: "Interrumpir", icon: <Mic className="h-5 w-5" />, onClick: onForceInterruption },
    {
      label: "Aire",
      icon: <Radio className="h-5 w-5" />,
      onClick: onViewSchedule,
      highlight: true,
    },
    { label: "Demo", icon: <Megaphone className="h-5 w-5" />, onClick: onDemoAd },
    { label: "Grilla", icon: <CalendarDays className="h-5 w-5" />, onClick: onViewSchedule },
    { label: "Más", icon: <MoreHorizontal className="h-5 w-5" />, onClick: onMore },
  ];

  return (
    <nav
      aria-label="Controles de cabina"
      className={cn(
        "mx-auto flex max-w-3xl items-end justify-between gap-1 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onClick}
          className={cn(
            "flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-[10px] font-medium transition-colors",
            action.highlight && centerActive
              ? "-translate-y-2 rounded-full bg-[color:var(--primary)] px-3 py-3 text-[color:var(--primary-foreground)] shadow-[0_0_20px_var(--primary-glow)]"
              : "text-[color:var(--muted)] hover:text-[color:var(--text)]",
          )}
        >
          {action.icon}
          <span className={action.highlight && centerActive ? "sr-only" : undefined}>{action.label}</span>
        </button>
      ))}
    </nav>
  );
}

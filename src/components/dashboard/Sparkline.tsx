import { cn } from "@/lib/utils";

export type SparklineTone = "lime" | "purple" | "blue" | "yellow";

const TONE_COLORS: Record<SparklineTone, { stroke: string; fill: string }> = {
  lime: { stroke: "#C2FC4A", fill: "rgba(194,252,74,0.12)" },
  purple: { stroke: "#A855F7", fill: "rgba(168,85,247,0.12)" },
  blue: { stroke: "#38BDF8", fill: "rgba(56,189,248,0.12)" },
  yellow: { stroke: "#EAB308", fill: "rgba(234,179,8,0.12)" },
};

const PATHS: Record<SparklineTone, string> = {
  lime: "M0 18 L8 14 L16 16 L24 10 L32 12 L40 6 L48 8 L56 4 L64 6",
  purple: "M0 16 L8 12 L16 14 L24 8 L32 10 L40 12 L48 6 L56 8 L64 4",
  blue: "M0 14 L8 16 L16 10 L24 12 L32 8 L40 10 L48 14 L56 6 L64 8",
  yellow: "M0 12 L8 14 L16 8 L24 10 L32 6 L40 8 L48 4 L56 6 L64 2",
};

export type SparklineProps = {
  tone?: SparklineTone;
  className?: string;
};

export function Sparkline({ tone = "lime", className }: SparklineProps): React.ReactElement {
  const colors = TONE_COLORS[tone];
  const path = PATHS[tone];

  return (
    <svg
      aria-hidden
      className={cn("h-10 w-full", className)}
      preserveAspectRatio="none"
      viewBox="0 0 64 20"
    >
      <defs>
        <linearGradient id={`spark-fill-${tone}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={colors.fill} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path d={`${path} L64 20 L0 20 Z`} fill={`url(#spark-fill-${tone})`} />
      <path
        d={path}
        fill="none"
        stroke={colors.stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

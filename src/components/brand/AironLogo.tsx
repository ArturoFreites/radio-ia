import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZE_CONFIG = {
  xs: { width: 72, className: "w-[72px]" },
  sm: { width: 88, className: "w-[88px]" },
  md: { width: 100, className: "w-[100px]" },
  lg: { width: 140, className: "w-[140px]" },
  xl: { width: 180, className: "w-[180px]" },
} as const;

export type AironLogoSize = keyof typeof SIZE_CONFIG;

export type AironLogoProps = {
  size?: AironLogoSize;
  className?: string;
  priority?: boolean;
};

export function AironLogo({
  size = "md",
  className,
  priority = false,
}: AironLogoProps): React.ReactElement {
  const config = SIZE_CONFIG[size];

  return (
    <Image
      alt="Airon"
      className={cn("h-auto object-contain", config.className, className)}
      height={682}
      priority={priority}
      src="/airon-logo.png"
      width={1024}
    />
  );
}

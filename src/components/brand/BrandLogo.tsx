import Image from "next/image";
import { SpotifyIcon } from "@/components/brand/SpotifyIcon";
import { cn } from "@/lib/utils";

export type BrandId = "gemini" | "elevenlabs" | "spotify";

const BRANDS: Record<
  Exclude<BrandId, "spotify">,
  { src: string; alt: string; width: number; height: number; wide?: boolean }
> = {
  gemini: { src: "/logos/gemini.png", alt: "Google Gemini", width: 980, height: 980 },
  elevenlabs: {
    src: "/logos/elevenlabs.png",
    alt: "ElevenLabs",
    width: 920,
    height: 620,
    wide: true,
  },
};

const SIZE_CLASSES: Record<"xs" | "sm" | "md" | "lg" | "xl", { height: string; wideWidth: string }> = {
  xs: { height: "h-3.5", wideWidth: "w-10" },
  sm: { height: "h-4", wideWidth: "w-11" },
  md: { height: "h-5", wideWidth: "w-14" },
  lg: { height: "h-6", wideWidth: "w-16" },
  xl: { height: "h-10", wideWidth: "w-24" },
};

export type BrandLogoProps = {
  brand: BrandId;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  /** Fondo claro para wordmarks oscuros sobre UI oscura (ElevenLabs). */
  padded?: boolean;
};

export function BrandLogo({
  brand,
  size = "md",
  className,
  padded = false,
}: BrandLogoProps): React.ReactElement {
  if (brand === "spotify") {
    return (
      <span className={cn("inline-flex shrink-0 items-center justify-center", className)}>
        <SpotifyIcon size={size} />
      </span>
    );
  }

  const config = BRANDS[brand];
  const sizeClass = SIZE_CLASSES[size];
  const isWide = config.wide === true;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden",
        isWide ? cn(sizeClass.height, sizeClass.wideWidth) : cn(sizeClass.height, sizeClass.height),
        padded && brand === "elevenlabs" && "rounded-md bg-white px-1",
        className,
      )}
    >
      <Image
        alt={config.alt}
        className="object-contain"
        fill
        sizes={isWide ? "96px" : "40px"}
        src={config.src}
      />
    </span>
  );
}

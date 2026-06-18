import { faSpotify } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@/lib/utils";

const SIZE_CLASSES: Record<"xs" | "sm" | "md" | "lg" | "xl", string> = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-10 w-10",
};

export type SpotifyIconProps = {
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  /** Muestra el verde oficial de Spotify (#1DB954). */
  branded?: boolean;
};

export function SpotifyIcon({
  size = "md",
  className,
  branded = true,
}: SpotifyIconProps): React.ReactElement {
  return (
    <FontAwesomeIcon
      aria-hidden
      className={cn(
        "inline-block shrink-0",
        SIZE_CLASSES[size],
        branded && "text-[#1DB954]",
        className,
      )}
      icon={faSpotify}
    />
  );
}

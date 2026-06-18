export function formatearBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function etiquetaCategoria(nombre: string): string {
  switch (nombre) {
    case "previews":
      return "Previews de bloques";
    case "spotify":
      return "Audio Spotify / DJ";
    case "programas":
      return "Programas generados";
    case "otros":
      return "Otros archivos";
    default:
      return nombre;
  }
}

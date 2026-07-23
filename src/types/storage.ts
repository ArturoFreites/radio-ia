export type StorageCategoria = {
  nombre: string;
  bytes: number;
  archivos: number;
};

export type StorageStatsResponse = {
  totalBytes: number;
  categorias: StorageCategoria[];
};

export type LimpiarRequest = {
  categorias: string[];
};

export type LimpiarResponse = {
  eliminados: number;
  liberadoBytes: number;
};

export const STORAGE_CATEGORIA_NOMBRES = ["previews", "spotify", "programas", "biblioteca", "otros"] as const;

export type StorageCategoriaNombre = (typeof STORAGE_CATEGORIA_NOMBRES)[number];

import { access, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { EstadoBloque } from "@prisma/client";
import { getAudioStorageRoot } from "@/lib/audio/previewPaths";
import { prisma } from "@/lib/prisma";
import type { LimpiarResponse, StorageCategoria, StorageStatsResponse } from "@/types/storage";
import { STORAGE_CATEGORIA_NOMBRES } from "@/types/storage";

export { etiquetaCategoria, formatearBytes } from "@/lib/audio/storageFormat";

type ContadorCategoria = {
  bytes: number;
  archivos: number;
};

function contadorVacio(): ContadorCategoria {
  return { bytes: 0, archivos: 0 };
}

function sumarArchivo(contador: ContadorCategoria, bytes: number): void {
  contador.bytes += bytes;
  contador.archivos += 1;
}

async function existeRuta(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function recorrerArchivos(
  dir: string,
  visitar: (filePath: string, size: number) => void | Promise<void>,
): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await recorrerArchivos(fullPath, visitar);
    } else if (entry.isFile()) {
      const info = await stat(fullPath);
      await visitar(fullPath, info.size);
    }
  }
}

async function recorrerDirectorio(
  dir: string,
  visitar: (contador: ContadorCategoria) => void | Promise<void>,
): Promise<void> {
  const contador = contadorVacio();
  await recorrerArchivos(dir, (_path, size) => {
    sumarArchivo(contador, size);
  });
  await visitar(contador);
}

function bloquePreviewProtegido(audioUrl: string | null, bloqueId: string): boolean {
  if (!audioUrl) return false;
  const esperado = `/api/audio/preview/${bloqueId}`;
  return audioUrl === esperado || audioUrl.startsWith(`${esperado}?`);
}

async function idsPresentacionesRadio(radioId: string): Promise<Set<string>> {
  const filas = await prisma.presentacionTrack.findMany({
    where: { sesion: { radioId } },
    select: { id: true },
  });
  return new Set(filas.map((f) => f.id));
}

async function idsBloquesRadio(radioId: string): Promise<Set<string>> {
  const filas = await prisma.bloque.findMany({
    where: { programa: { radioId } },
    select: { id: true },
  });
  return new Set(filas.map((f) => f.id));
}

async function idsPreviewsProtegidos(radioId: string): Promise<Set<string>> {
  const bloques = await prisma.bloque.findMany({
    where: {
      programa: { radioId },
      audioUrl: { not: null },
      estado: { in: [EstadoBloque.LISTO, EstadoBloque.GUION_LISTO, EstadoBloque.GENERANDO_AUDIO] },
    },
    select: { id: true, audioUrl: true },
  });
  const protegidos = new Set<string>();
  for (const bloque of bloques) {
    if (bloquePreviewProtegido(bloque.audioUrl, bloque.id)) {
      protegidos.add(bloque.id);
    }
  }
  return protegidos;
}

async function acumularPreviews(
  root: string,
  radioId: string,
  destino: ContadorCategoria,
): Promise<void> {
  const previewsRoot = join(root, "previews");
  if (!(await existeRuta(previewsRoot))) return;

  const bloquesRadio = await idsBloquesRadio(radioId);
  const entries = await readdir(previewsRoot, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!bloquesRadio.has(entry.name)) continue;
    await recorrerDirectorio(join(previewsRoot, entry.name), (c) => {
      destino.bytes += c.bytes;
      destino.archivos += c.archivos;
    });
  }
}

async function acumularSpotify(
  root: string,
  radioId: string,
  destino: ContadorCategoria,
): Promise<void> {
  const spotifyRoot = join(root, "spotify");
  if (!(await existeRuta(spotifyRoot))) return;

  const ids = await idsPresentacionesRadio(radioId);
  await recorrerArchivos(spotifyRoot, (filePath, size) => {
    const base = filePath.slice(spotifyRoot.length + 1);
    const segmentos = base.split("/");
    const id = segmentos[0] === "work" ? segmentos[1] : segmentos[0]?.replace(/\.mp3$/i, "");
    if (!id || !ids.has(id)) return;
    sumarArchivo(destino, size);
  });
}

async function acumularProgramas(root: string, radioId: string, destino: ContadorCategoria): Promise<void> {
  const programasRoot = join(root, radioId);
  if (!(await existeRuta(programasRoot))) return;
  await recorrerArchivos(programasRoot, (filePath, size) => {
    const rel = filePath.slice(programasRoot.length + 1);
    if (rel === "biblioteca" || rel.startsWith(`biblioteca/`) || rel.startsWith(`biblioteca\\`)) {
      return;
    }
    sumarArchivo(destino, size);
  });
}

async function acumularBiblioteca(root: string, radioId: string, destino: ContadorCategoria): Promise<void> {
  const bibliotecaRoot = join(root, radioId, "biblioteca");
  if (!(await existeRuta(bibliotecaRoot))) return;
  await recorrerDirectorio(bibliotecaRoot, (c) => {
    destino.bytes += c.bytes;
    destino.archivos += c.archivos;
  });
}

async function acumularOtros(root: string, radioId: string, destino: ContadorCategoria): Promise<void> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory() && entry.isFile()) {
      const info = await stat(join(root, entry.name));
      sumarArchivo(destino, info.size);
      continue;
    }
    if (!entry.isDirectory()) continue;
    if (entry.name === "previews" || entry.name === "spotify" || entry.name === radioId) continue;
    await recorrerDirectorio(join(root, entry.name), (c) => {
      destino.bytes += c.bytes;
      destino.archivos += c.archivos;
    });
  }
}

function aCategorias(contadores: Record<string, ContadorCategoria>): StorageCategoria[] {
  return STORAGE_CATEGORIA_NOMBRES.map((nombre) => ({
    nombre,
    bytes: contadores[nombre]?.bytes ?? 0,
    archivos: contadores[nombre]?.archivos ?? 0,
  }));
}

export async function obtenerStorageStats(radioId: string): Promise<StorageStatsResponse> {
  const root = getAudioStorageRoot();
  if (!(await existeRuta(root))) {
    return { totalBytes: 0, categorias: aCategorias({}) };
  }

  const contadores: Record<string, ContadorCategoria> = {
    previews: contadorVacio(),
    spotify: contadorVacio(),
    programas: contadorVacio(),
    biblioteca: contadorVacio(),
    otros: contadorVacio(),
  };

  await acumularPreviews(root, radioId, contadores.previews);
  await acumularSpotify(root, radioId, contadores.spotify);
  await acumularProgramas(root, radioId, contadores.programas);
  await acumularBiblioteca(root, radioId, contadores.biblioteca);
  await acumularOtros(root, radioId, contadores.otros);

  const categorias = aCategorias(contadores);
  const totalBytes = categorias.reduce((acc, c) => acc + c.bytes, 0);
  return { totalBytes, categorias };
}

async function eliminarPreviews(radioId: string): Promise<LimpiarResponse> {
  const root = getAudioStorageRoot();
  const previewsRoot = join(root, "previews");
  let eliminados = 0;
  let liberadoBytes = 0;

  if (!(await existeRuta(previewsRoot))) {
    return { eliminados, liberadoBytes };
  }

  const [bloquesRadio, protegidos] = await Promise.all([idsBloquesRadio(radioId), idsPreviewsProtegidos(radioId)]);
  const entries = await readdir(previewsRoot, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!bloquesRadio.has(entry.name)) continue;
    if (protegidos.has(entry.name)) continue;

    const dirPath = join(previewsRoot, entry.name);
    const antes = contadorVacio();
    await recorrerDirectorio(dirPath, (c) => {
      antes.bytes += c.bytes;
      antes.archivos += c.archivos;
    });
    await rm(dirPath, { recursive: true, force: true });
    eliminados += antes.archivos;
    liberadoBytes += antes.bytes;
  }

  return { eliminados, liberadoBytes };
}

async function eliminarSpotify(radioId: string): Promise<LimpiarResponse> {
  const root = getAudioStorageRoot();
  const spotifyRoot = join(root, "spotify");
  let eliminados = 0;
  let liberadoBytes = 0;

  if (!(await existeRuta(spotifyRoot))) {
    return { eliminados, liberadoBytes };
  }

  const ids = await idsPresentacionesRadio(radioId);
  for (const id of ids) {
    const candidatos = [
      join(spotifyRoot, `${id}.mp3`),
      join(spotifyRoot, "work", id),
    ];
    for (const path of candidatos) {
      if (!(await existeRuta(path))) continue;
      const antes = contadorVacio();
      const info = await stat(path);
      if (info.isDirectory()) {
        await recorrerDirectorio(path, (c) => {
          antes.bytes += c.bytes;
          antes.archivos += c.archivos;
        });
      } else {
        sumarArchivo(antes, info.size);
      }
      await rm(path, { recursive: true, force: true });
      eliminados += antes.archivos;
      liberadoBytes += antes.bytes;
    }
  }

  return { eliminados, liberadoBytes };
}

async function eliminarProgramas(radioId: string): Promise<LimpiarResponse> {
  const root = getAudioStorageRoot();
  const programasRoot = join(root, radioId);
  let eliminados = 0;
  let liberadoBytes = 0;

  if (!(await existeRuta(programasRoot))) {
    return { eliminados, liberadoBytes };
  }

  const entries = await readdir(programasRoot, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (entry.name === "biblioteca") continue;
    const fullPath = join(programasRoot, entry.name);
    const antes = contadorVacio();
    if (entry.isDirectory()) {
      await recorrerDirectorio(fullPath, (c) => {
        antes.bytes += c.bytes;
        antes.archivos += c.archivos;
      });
    } else if (entry.isFile()) {
      const info = await stat(fullPath);
      sumarArchivo(antes, info.size);
    } else {
      continue;
    }
    await rm(fullPath, { recursive: true, force: true });
    eliminados += antes.archivos;
    liberadoBytes += antes.bytes;
  }
  return { eliminados, liberadoBytes };
}

async function eliminarBiblioteca(radioId: string): Promise<LimpiarResponse> {
  const root = getAudioStorageRoot();
  const bibliotecaRoot = join(root, radioId, "biblioteca");
  let eliminados = 0;
  let liberadoBytes = 0;

  if (!(await existeRuta(bibliotecaRoot))) {
    return { eliminados, liberadoBytes };
  }

  const antes = contadorVacio();
  await recorrerDirectorio(bibliotecaRoot, (c) => {
    antes.bytes += c.bytes;
    antes.archivos += c.archivos;
  });
  await rm(bibliotecaRoot, { recursive: true, force: true });
  eliminados = antes.archivos;
  liberadoBytes = antes.bytes;
  return { eliminados, liberadoBytes };
}

async function eliminarOtros(radioId: string): Promise<LimpiarResponse> {
  const root = getAudioStorageRoot();
  let eliminados = 0;
  let liberadoBytes = 0;

  if (!(await existeRuta(root))) {
    return { eliminados, liberadoBytes };
  }

  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (entry.isFile()) {
      const path = join(root, entry.name);
      const info = await stat(path);
      await rm(path, { force: true });
      eliminados += 1;
      liberadoBytes += info.size;
      continue;
    }
    if (!entry.isDirectory()) continue;
    if (entry.name === "previews" || entry.name === "spotify" || entry.name === radioId) continue;

    const dirPath = join(root, entry.name);
    const antes = contadorVacio();
    await recorrerDirectorio(dirPath, (c) => {
      antes.bytes += c.bytes;
      antes.archivos += c.archivos;
    });
    await rm(dirPath, { recursive: true, force: true });
    eliminados += antes.archivos;
    liberadoBytes += antes.bytes;
  }

  return { eliminados, liberadoBytes };
}

const LIMPIADORES: Record<string, (radioId: string) => Promise<LimpiarResponse>> = {
  previews: eliminarPreviews,
  spotify: eliminarSpotify,
  programas: eliminarProgramas,
  biblioteca: eliminarBiblioteca,
  otros: eliminarOtros,
};

export async function limpiarStorage(radioId: string, categorias: string[]): Promise<LimpiarResponse> {
  const objetivos =
    categorias.length === 0 ? [...STORAGE_CATEGORIA_NOMBRES] : categorias.filter((c) => c in LIMPIADORES);

  let eliminados = 0;
  let liberadoBytes = 0;
  for (const nombre of objetivos) {
    const limpiar = LIMPIADORES[nombre];
    if (!limpiar) continue;
    const resultado = await limpiar(radioId);
    eliminados += resultado.eliminados;
    liberadoBytes += resultado.liberadoBytes;
  }
  return { eliminados, liberadoBytes };
}

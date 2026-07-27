import { access, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { getAudioStorageRoot } from "@/lib/audio/previewPaths";
import {
  claveNombreDescargaBase,
  nombreDescargaAudio,
  type TipoAudioGenerado,
} from "@/lib/audios/nombreDescarga";
import { contentTypeDesdeRutaAudio, resolverRutaAudioAlmacenado } from "@/lib/publicidad/audioPath";
import { prisma } from "@/lib/prisma";
import { presentacionFilesystemPath } from "@/lib/spotify/presentacionServicio";
import { transicionSlotAudioPath } from "@/lib/spotify/generarTransicionSlot";

export type { TipoAudioGenerado };

export type AudioGeneradoItem = {
  id: string;
  tipo: TipoAudioGenerado;
  titulo: string;
  contexto: string;
  creadoEn: string;
  duracionSec: number | null;
  tieneAudio: boolean;
  streamUrl: string;
  nombreDescarga: string;
};

export const TIPOS_AUDIO_GENERADO = [
  "PRESENTACION",
  "INTRO_APERTURA",
  "TRANSICION_SLOT",
  "PUBLICIDAD",
  "DEMO_PUBLICIDAD",
] as const;

export type TipoAudioGeneradoTuple = typeof TIPOS_AUDIO_GENERADO;

type ItemBorrador = {
  id: string;
  tipo: TipoAudioGenerado;
  titulo: string;
  contexto: string;
  creadoEn: Date;
  duracionSec: number | null;
  tieneAudio: boolean;
  playlistId?: string | null;
};

async function existeArchivo(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function truncarContexto(texto: string | null | undefined, max = 140): string {
  const t = (texto ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function streamUrlPara(item: ItemBorrador): string {
  const q = new URLSearchParams({ tipo: item.tipo });
  if (item.playlistId) q.set("playlistId", item.playlistId);
  return `/api/audios/generados/${encodeURIComponent(item.id)}?${q.toString()}`;
}

function asignarNombres(items: ItemBorrador[]): AudioGeneradoItem[] {
  const contadores = new Map<string, number>();
  for (const item of items) {
    const clave = claveNombreDescargaBase({
      tipo: item.tipo,
      titulo: item.titulo,
      creadoEn: item.creadoEn,
    });
    contadores.set(clave, (contadores.get(clave) ?? 0) + 1);
  }

  return items.map((item) => {
    const clave = claveNombreDescargaBase({
      tipo: item.tipo,
      titulo: item.titulo,
      creadoEn: item.creadoEn,
    });
    const incluirHora = (contadores.get(clave) ?? 0) > 1;
    return {
      id: item.id,
      tipo: item.tipo,
      titulo: item.titulo,
      contexto: item.contexto,
      creadoEn: item.creadoEn.toISOString(),
      duracionSec: item.duracionSec,
      tieneAudio: item.tieneAudio,
      streamUrl: streamUrlPara(item),
      nombreDescarga: nombreDescargaAudio({
        tipo: item.tipo,
        titulo: item.titulo,
        creadoEn: item.creadoEn,
        incluirHora,
      }),
    };
  });
}

async function listarPresentaciones(radioId: string): Promise<ItemBorrador[]> {
  const presentaciones = await prisma.presentacionTrack.findMany({
    where: {
      sesion: { radioId },
      OR: [{ estado: "LISTA" }, { audioUrl: { not: null } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      trackNombre: true,
      artistaNombre: true,
      albumNombre: true,
      guion: true,
      audioUrl: true,
      createdAt: true,
      estado: true,
    },
  });

  const items: ItemBorrador[] = [];
  for (const p of presentaciones) {
    const path = presentacionFilesystemPath(p.id);
    const tieneAudio = await existeArchivo(path);
    items.push({
      id: p.id,
      tipo: "PRESENTACION",
      titulo: p.trackNombre,
      contexto: truncarContexto(
        [p.artistaNombre, p.albumNombre, p.guion].filter(Boolean).join(" · "),
      ),
      creadoEn: p.createdAt,
      duracionSec: null,
      tieneAudio,
    });
  }
  return items;
}

async function listarIntros(radioId: string): Promise<ItemBorrador[]> {
  const sesiones = await prisma.spotifySesion.findMany({
    where: { radioId },
    select: {
      id: true,
      playlistNombre: true,
      playlistId: true,
      createdAt: true,
    },
  });
  if (sesiones.length === 0) return [];

  const spotifyRoot = join(getAudioStorageRoot(), "spotify");
  let archivos: string[] = [];
  try {
    archivos = await readdir(spotifyRoot);
  } catch {
    return [];
  }

  const items: ItemBorrador[] = [];
  for (const sesion of sesiones) {
    const prefijo = `intro-${sesion.id}`;
    const matches = archivos.filter(
      (name) => name.startsWith(prefijo) && name.toLowerCase().endsWith(".mp3"),
    );
    for (const name of matches) {
      const filePath = join(spotifyRoot, name);
      let creadoEn = sesion.createdAt;
      try {
        const info = await stat(filePath);
        creadoEn = info.mtime;
      } catch {
        continue;
      }

      const sinExt = name.replace(/\.mp3$/i, "");
      const resto = sinExt.slice(prefijo.length); // "" | "-{hash}"
      const playlistHash = resto.startsWith("-") ? resto.slice(1) : null;
      const id = playlistHash ? `${sesion.id}:${playlistHash}` : sesion.id;
      const playlistId =
        playlistHash && sesion.playlistId?.startsWith(playlistHash)
          ? sesion.playlistId
          : playlistHash
            ? null
            : sesion.playlistId;

      items.push({
        id,
        tipo: "INTRO_APERTURA",
        titulo: sesion.playlistNombre || "Intro de apertura",
        contexto: truncarContexto(
          `Intro de sesión · playlist ${sesion.playlistNombre || sesion.playlistId || "sin nombre"}`,
        ),
        creadoEn,
        duracionSec: null,
        tieneAudio: true,
        playlistId,
      });
    }
  }
  return items;
}

async function listarTransiciones(radioId: string): Promise<ItemBorrador[]> {
  const [slots, eventos] = await Promise.all([
    prisma.slotGrilla.findMany({
      where: { radioId },
      select: {
        id: true,
        horaInicio: true,
        diaDeSemana: true,
        playlistNombre: true,
        updatedAt: true,
      },
    }),
    prisma.eventoGrilla.findMany({
      where: { radioId },
      select: {
        id: true,
        horaInicio: true,
        fecha: true,
        playlistNombre: true,
        createdAt: true,
      },
    }),
  ]);

  const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const items: ItemBorrador[] = [];

  for (const slot of slots) {
    const path = transicionSlotAudioPath(slot.id);
    if (!(await existeArchivo(path))) continue;
    let creadoEn = slot.updatedAt;
    try {
      creadoEn = (await stat(path)).mtime;
    } catch {
      /* keep updatedAt */
    }
    const dia = DIAS[slot.diaDeSemana] ?? `Día ${slot.diaDeSemana}`;
    items.push({
      id: slot.id,
      tipo: "TRANSICION_SLOT",
      titulo: slot.playlistNombre?.trim() || `Slot ${dia} ${slot.horaInicio}`,
      contexto: truncarContexto(`Transición de slot · ${dia} ${slot.horaInicio}`),
      creadoEn,
      duracionSec: null,
      tieneAudio: true,
    });
  }

  for (const evento of eventos) {
    const path = transicionSlotAudioPath(evento.id);
    if (!(await existeArchivo(path))) continue;
    let creadoEn = evento.createdAt;
    try {
      creadoEn = (await stat(path)).mtime;
    } catch {
      /* keep createdAt */
    }
    const fecha = evento.fecha.toISOString().slice(0, 10);
    items.push({
      id: evento.id,
      tipo: "TRANSICION_SLOT",
      titulo: evento.playlistNombre?.trim() || `Evento ${fecha} ${evento.horaInicio}`,
      contexto: truncarContexto(`Transición de evento · ${fecha} ${evento.horaInicio}`),
      creadoEn,
      duracionSec: null,
      tieneAudio: true,
    });
  }

  return items;
}

async function listarPublicidades(radioId: string): Promise<ItemBorrador[]> {
  const anunciantes = await prisma.anunciante.findMany({
    where: { radioId, audioUrl: { not: null } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      nombre: true,
      texto: true,
      audioUrl: true,
      duracion: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  const items: ItemBorrador[] = [];
  for (const a of anunciantes) {
    if (!a.audioUrl) continue;
    const filePath = await resolverRutaAudioAlmacenado(a.audioUrl);
    items.push({
      id: a.id,
      tipo: "PUBLICIDAD",
      titulo: a.nombre,
      contexto: truncarContexto(a.texto) || "Publicidad TTS",
      creadoEn: a.updatedAt ?? a.createdAt,
      duracionSec: a.duracion ?? null,
      tieneAudio: Boolean(filePath),
    });
  }
  return items;
}

export type ListarAudiosGeneradosOptions = {
  tipo?: TipoAudioGenerado;
  q?: string;
};

export async function listarAudiosGenerados(
  radioId: string,
  options: ListarAudiosGeneradosOptions = {},
): Promise<AudioGeneradoItem[]> {
  const tipo = options.tipo;
  if (tipo === "DEMO_PUBLICIDAD") {
    return [];
  }

  const cargas: Array<Promise<ItemBorrador[]>> = [];
  if (!tipo || tipo === "PRESENTACION") cargas.push(listarPresentaciones(radioId));
  if (!tipo || tipo === "INTRO_APERTURA") cargas.push(listarIntros(radioId));
  if (!tipo || tipo === "TRANSICION_SLOT") cargas.push(listarTransiciones(radioId));
  if (!tipo || tipo === "PUBLICIDAD") cargas.push(listarPublicidades(radioId));

  const grupos = await Promise.all(cargas);
  let items = grupos.flat();

  const q = options.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (item) =>
        item.titulo.toLowerCase().includes(q) || item.contexto.toLowerCase().includes(q),
    );
  }

  items.sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime());
  return asignarNombres(items);
}

export type AudioGeneradoResuelto = {
  filePath: string;
  contentType: ReturnType<typeof contentTypeDesdeRutaAudio>;
  nombreDescarga: string;
  titulo: string;
  tipo: TipoAudioGenerado;
  creadoEn: Date;
};

export async function resolverAudioGenerado(
  radioId: string,
  id: string,
  tipo: TipoAudioGenerado,
  playlistId?: string | null,
): Promise<AudioGeneradoResuelto | null> {
  if (tipo === "DEMO_PUBLICIDAD") return null;

  if (tipo === "PRESENTACION") {
    const presentacion = await prisma.presentacionTrack.findFirst({
      where: { id, sesion: { radioId } },
      select: { id: true, trackNombre: true, createdAt: true },
    });
    if (!presentacion) return null;
    const filePath = presentacionFilesystemPath(presentacion.id);
    if (!(await existeArchivo(filePath))) return null;
    return {
      filePath,
      contentType: contentTypeDesdeRutaAudio(filePath),
      nombreDescarga: nombreDescargaAudio({
        tipo,
        titulo: presentacion.trackNombre,
        creadoEn: presentacion.createdAt,
      }),
      titulo: presentacion.trackNombre,
      tipo,
      creadoEn: presentacion.createdAt,
    };
  }

  if (tipo === "INTRO_APERTURA") {
    const [sesionId, playlistHashFromId] = id.includes(":") ? id.split(":", 2) : [id, null];
    const sesion = await prisma.spotifySesion.findFirst({
      where: { id: sesionId, radioId },
      select: { id: true, playlistNombre: true, playlistId: true, createdAt: true },
    });
    if (!sesion) return null;

    const hash =
      playlistHashFromId ??
      (playlistId ? playlistId.slice(0, 8) : null) ??
      (sesion.playlistId ? sesion.playlistId.slice(0, 8) : null);

    const candidatos = [
      hash ? join(getAudioStorageRoot(), "spotify", `intro-${sesion.id}-${hash}.mp3`) : null,
      join(getAudioStorageRoot(), "spotify", `intro-${sesion.id}.mp3`),
    ].filter((p): p is string => Boolean(p));

    for (const filePath of candidatos) {
      if (!(await existeArchivo(filePath))) continue;
      let creadoEn = sesion.createdAt;
      try {
        creadoEn = (await stat(filePath)).mtime;
      } catch {
        /* keep */
      }
      const titulo = sesion.playlistNombre || "Intro de apertura";
      return {
        filePath,
        contentType: contentTypeDesdeRutaAudio(filePath),
        nombreDescarga: nombreDescargaAudio({ tipo, titulo, creadoEn }),
        titulo,
        tipo,
        creadoEn,
      };
    }
    return null;
  }

  if (tipo === "TRANSICION_SLOT") {
    const [slot, evento] = await Promise.all([
      prisma.slotGrilla.findFirst({
        where: { id, radioId },
        select: { id: true, playlistNombre: true, horaInicio: true, diaDeSemana: true, updatedAt: true },
      }),
      prisma.eventoGrilla.findFirst({
        where: { id, radioId },
        select: { id: true, playlistNombre: true, horaInicio: true, fecha: true, createdAt: true },
      }),
    ]);
    const filePath = transicionSlotAudioPath(id);
    if (!(await existeArchivo(filePath))) return null;

    let titulo = "Transición de slot";
    let creadoEn = new Date();
    if (slot) {
      const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      const dia = DIAS[slot.diaDeSemana] ?? `Día ${slot.diaDeSemana}`;
      titulo = slot.playlistNombre?.trim() || `Slot ${dia} ${slot.horaInicio}`;
      creadoEn = slot.updatedAt;
    } else if (evento) {
      const fecha = evento.fecha.toISOString().slice(0, 10);
      titulo = evento.playlistNombre?.trim() || `Evento ${fecha} ${evento.horaInicio}`;
      creadoEn = evento.createdAt;
    } else {
      return null;
    }

    try {
      creadoEn = (await stat(filePath)).mtime;
    } catch {
      /* keep */
    }

    return {
      filePath,
      contentType: contentTypeDesdeRutaAudio(filePath),
      nombreDescarga: nombreDescargaAudio({ tipo, titulo, creadoEn }),
      titulo,
      tipo,
      creadoEn,
    };
  }

  if (tipo === "PUBLICIDAD") {
    const anunciante = await prisma.anunciante.findFirst({
      where: { id, radioId },
      select: { id: true, nombre: true, audioUrl: true, updatedAt: true, createdAt: true },
    });
    if (!anunciante?.audioUrl) return null;
    const filePath = await resolverRutaAudioAlmacenado(anunciante.audioUrl);
    if (!filePath) return null;
    const creadoEn = anunciante.updatedAt ?? anunciante.createdAt;
    return {
      filePath,
      contentType: contentTypeDesdeRutaAudio(filePath),
      nombreDescarga: nombreDescargaAudio({
        tipo,
        titulo: anunciante.nombre,
        creadoEn,
      }),
      titulo: anunciante.nombre,
      tipo,
      creadoEn,
    };
  }

  return null;
}

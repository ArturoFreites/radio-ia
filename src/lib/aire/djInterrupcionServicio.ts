import { readFile } from "node:fs/promises";
import { descripcionClimaCodigo, formatHoraArgentina, parseClimaJson } from "@/lib/aire/djInterrupciones";
import type { RadioPorAireToken } from "@/lib/aire/validarToken";
import { fetchClima } from "@/lib/entretenimiento/clima";
import { generarTextoGemini } from "@/lib/gemini/guiones";
import { synthesizeElevenLabsBuffer } from "@/lib/gemini/tts";
import { sanitizarDjTextoContenido } from "@/lib/grilla/djConfigSchema";
import {
  contentTypeDesdeRutaAudio,
  resolverRutaAudioAlmacenado,
  type AudioAlmacenadoContentType,
} from "@/lib/publicidad/audioPath";
import { publicidadTieneContenido } from "@/lib/publicidad/filtros";
import { normalizarGuionParaLocucion } from "@/lib/publicidad/guionLocucion";
import { prisma } from "@/lib/prisma";
import type { TipoInterrupcionDj } from "@/types/grilla";

function buildHoraPrompt(hora: string, estiloRadio: string): string {
  return `Sos locutor de radio en Argentina. Decí la hora en voseo rioplatense, tono ${estiloRadio}.
Hora actual: ${hora}.
Duración: unos 15 segundos. Solo texto plano, sin comillas.`;
}

function buildClimaPrompt(
  datos: { temperatura: number; maxima: number; minima: number; descripcion: string },
  estiloRadio: string,
): string {
  return `Sos locutor de radio en Argentina. Informá el clima en voseo rioplatense, tono ${estiloRadio}.
Temperatura actual: ${Math.round(datos.temperatura)}°C. Máxima hoy: ${Math.round(datos.maxima)}°C. Mínima: ${Math.round(datos.minima)}°C. Condición: ${datos.descripcion}.
PROHIBIDO mencionar ciudad, provincia, barrio o cualquier nombre de lugar.
Duración: unos 20 segundos. Solo texto plano.`;
}

export async function validarVozRadioDj(radioId: string, voiceId: string): Promise<boolean> {
  const vozAsignada = await prisma.radioVoz.findFirst({
    where: {
      radioId,
      voz: { geminiVoiceId: voiceId, esActiva: true },
    },
    select: { id: true },
  });
  return vozAsignada !== null;
}

export async function generarGuionInterrupcionDj(
  radio: RadioPorAireToken,
  tipo: TipoInterrupcionDj,
  publicidadId?: string,
  horaObjetivoMs?: number,
  textoFijo?: string,
): Promise<string | null> {
  const estilo = radio.estiloLocucion ?? "cálido y cercano";

  if (tipo === "TEXTO") {
    const texto = sanitizarDjTextoContenido(textoFijo ?? "");
    return texto || null;
  }

  if (tipo === "HORA") {
    const hora = formatHoraArgentina(new Date(horaObjetivoMs ?? Date.now()));
    const guion = (await generarTextoGemini(buildHoraPrompt(hora, estilo), radio.id)).trim();
    return guion || null;
  }

  if (tipo === "CLIMA") {
    const rawClima = await fetchClima();
    const clima = parseClimaJson(rawClima);
    if (!clima) return null;
    const guion = (
      await generarTextoGemini(
        buildClimaPrompt(
          {
            ...clima,
            descripcion: descripcionClimaCodigo(clima.codigo),
          },
          estilo,
        ),
        radio.id,
      )
    ).trim();
    return guion || null;
  }

  if (tipo === "AUDIO") return null;

  if (!publicidadId) return null;

  const publicidad = await prisma.anunciante.findFirst({
    where: {
      id: publicidadId,
      esActivo: true,
      radioId: radio.id,
    },
  });
  if (!publicidad || !publicidadTieneContenido(publicidad.texto, publicidad.audioUrl)) {
    return null;
  }

  return normalizarGuionParaLocucion(publicidad.texto?.trim() ?? "") || null;
}

async function leerAudioPublicidad(
  radioId: string,
  publicidadId: string,
): Promise<{ buffer: Buffer; contentType: AudioAlmacenadoContentType } | null> {
  const publicidad = await prisma.anunciante.findFirst({
    where: {
      id: publicidadId,
      esActivo: true,
      radioId,
    },
    select: { audioUrl: true },
  });
  if (!publicidad?.audioUrl) return null;

  const filePath = await resolverRutaAudioAlmacenado(publicidad.audioUrl);
  if (!filePath) return null;

  try {
    const buffer = await readFile(filePath);
    return { buffer, contentType: contentTypeDesdeRutaAudio(filePath) };
  } catch {
    return null;
  }
}

export type ResultadoAudioInterrupcionDj =
  | { ok: true; buffer: Buffer; contentType: AudioAlmacenadoContentType }
  | { ok: false; status: number; error: string };

export async function generarAudioInterrupcionDj(params: {
  radio: RadioPorAireToken;
  tipo: TipoInterrupcionDj;
  voiceId: string;
  publicidadId?: string;
  horaObjetivoMs?: number;
  texto?: string;
}): Promise<ResultadoAudioInterrupcionDj> {
  const { radio, tipo, voiceId, publicidadId, horaObjetivoMs, texto } = params;

  if (tipo === "PUBLICIDAD" && publicidadId) {
    const pregrabado = await leerAudioPublicidad(radio.id, publicidadId);
    if (pregrabado) {
      return { ok: true, buffer: pregrabado.buffer, contentType: pregrabado.contentType };
    }
  }

  if (tipo === "TEXTO") {
    if (!process.env.ELEVENLABS_API_KEY) {
      return { ok: false, status: 503, error: "ELEVENLABS_API_KEY no configurada" };
    }

    const vozOk = await validarVozRadioDj(radio.id, voiceId);
    if (!vozOk) {
      return { ok: false, status: 400, error: "Voz no disponible para esta radio" };
    }

    const guion = await generarGuionInterrupcionDj(radio, "TEXTO", undefined, undefined, texto);
    if (!guion) {
      return { ok: false, status: 400, error: "Texto vacío o inválido" };
    }

    try {
      const { buffer } = await synthesizeElevenLabsBuffer({
        texto: guion,
        vozId: voiceId,
      });
      return { ok: true, buffer, contentType: "audio/mpeg" };
    } catch {
      return { ok: false, status: 502, error: "Error al generar el audio" };
    }
  }

  if (!process.env.GEMINI_API_KEY) {
    return { ok: false, status: 503, error: "GEMINI_API_KEY no configurada" };
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return { ok: false, status: 503, error: "ELEVENLABS_API_KEY no configurada" };
  }

  const vozOk = await validarVozRadioDj(radio.id, voiceId);
  if (!vozOk) {
    return { ok: false, status: 400, error: "Voz no disponible para esta radio" };
  }

  const guion = await generarGuionInterrupcionDj(radio, tipo, publicidadId, horaObjetivoMs);
  if (!guion) {
    return { ok: false, status: 502, error: "No se pudo obtener el texto de publicidad" };
  }

  try {
    const { buffer } = await synthesizeElevenLabsBuffer({
      texto: guion,
      vozId: voiceId,
    });
    return { ok: true, buffer, contentType: "audio/mpeg" };
  } catch {
    return { ok: false, status: 502, error: "Error al generar el audio" };
  }
}

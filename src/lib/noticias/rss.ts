import Parser from "rss-parser";
import { getRedis } from "@/lib/redis";

const parser = new Parser();

export type NoticiaRssItem = {
  titulo: string;
  resumen: string;
  url: string;
  fecha: Date;
  fuente: string;
};

type NoticiaCache = {
  titulo: string;
  resumen: string;
  url: string;
  fecha: string | number | Date;
  fuente: string;
};

function toDate(value: string | number | Date | undefined): Date {
  const parsed = value instanceof Date ? value : new Date(value ?? Date.now());
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function feedDomain(feedUrl: string): string {
  try {
    return new URL(feedUrl).hostname.replace(/^www\./, "");
  } catch {
    return feedUrl;
  }
}

async function fetchItemsFromFeed(feedUrl: string): Promise<NoticiaRssItem[]> {
  const redis = getRedis();
  const cacheKey = `rss:${feedUrl}`;
  const fuente = feedDomain(feedUrl);

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return (JSON.parse(cached) as NoticiaCache[]).map((item) => ({
        titulo: item.titulo,
        resumen: item.resumen,
        url: item.url,
        fecha: toDate(item.fecha),
        fuente: item.fuente,
      }));
    }

    const feed = await parser.parseURL(feedUrl);
    const items: NoticiaRssItem[] = feed.items.slice(0, 10).map((item) => ({
      titulo: item.title ?? "",
      resumen: item.contentSnippet ?? item.content ?? "",
      url: item.link ?? "",
      fecha: toDate(item.pubDate),
      fuente,
    }));

    await redis.set(
      cacheKey,
      JSON.stringify(
        items.map((item) => ({
          ...item,
          fecha: item.fecha.toISOString(),
        })),
      ),
      "EX",
      600,
    );

    return items;
  } catch {
    return [];
  }
}

export async function fetchNoticiasEstructuradas(params: {
  fuentesRSS: string[];
  cantidad: number;
}): Promise<NoticiaRssItem[]> {
  const noticias: NoticiaRssItem[] = [];

  for (const url of params.fuentesRSS) {
    const items = await fetchItemsFromFeed(url);
    noticias.push(...items.filter((item) => item.url.length > 0));
  }

  return noticias
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
    .slice(0, params.cantidad);
}

export async function fetchNoticias(params: {
  fuentesRSS: string[];
  cantidad: number;
}): Promise<string[]> {
  const noticias = await fetchNoticiasEstructuradas(params);

  if (!noticias.length) {
    return ["No hay noticias disponibles en este momento."];
  }

  return noticias.map((item) => `${item.titulo}: ${item.resumen}`);
}

import { Queue } from "bullmq";
import { getQueueConnection } from "@/lib/queue/connection";

let queue: Queue | null = null;
let previewQueue: Queue | null = null;
let spotifyPresentacionQueue: Queue | null = null;

export function getGeneracionQueue(): Queue {
  if (!queue) {
    queue = new Queue("generacion", { connection: getQueueConnection() });
  }
  return queue;
}

export function getGenerarPreviewQueue(): Queue {
  if (!previewQueue) {
    previewQueue = new Queue("generarPreview", { connection: getQueueConnection() });
  }
  return previewQueue;
}

export type SpotifyPresentacionJob = { presentacionId: string };

export function getSpotifyPresentacionQueue(): Queue<SpotifyPresentacionJob> {
  if (!spotifyPresentacionQueue) {
    spotifyPresentacionQueue = new Queue<SpotifyPresentacionJob>("spotify-presentaciones", {
      connection: getQueueConnection(),
    });
  }
  return spotifyPresentacionQueue;
}

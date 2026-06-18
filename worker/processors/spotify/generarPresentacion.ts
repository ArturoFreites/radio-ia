import type { Job } from "bullmq";
import { generarPresentacionTrack } from "@/lib/spotify/generarPresentacion";
import type { SpotifyPresentacionJob } from "@/lib/queue/jobs";

export async function procesarGenerarPresentacionSpotify(job: Job<SpotifyPresentacionJob>): Promise<void> {
  await generarPresentacionTrack(job.data.presentacionId);
}

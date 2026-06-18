import type { BloqueEditorItem } from "@/components/editor/BloqueCard";

export type PollBloquePreviewResult = "listo" | "error" | "timeout";

export async function pollBloquePreviewGeneracion(params: {
  bloqueId: string;
  onUpdate: (patch: Partial<BloqueEditorItem>) => void;
  isActive: () => boolean;
  fallbackConfig: Record<string, unknown>;
}): Promise<PollBloquePreviewResult> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline && params.isActive()) {
    await new Promise((r) => setTimeout(r, 2000));
    if (!params.isActive()) return "timeout";
    const st = await fetch(`/api/bloques/${params.bloqueId}`, { cache: "no-store" });
    if (!st.ok) break;
    const b = (await st.json()) as {
      estado?: string;
      audioUrl?: string | null;
      guion?: string | null;
      duracion?: number | null;
      config?: unknown;
    };
    const est = b.estado ?? "";
    if (est === "LISTO") {
      params.onUpdate({
        estado: est,
        audioUrl: b.audioUrl ?? null,
        duracion: b.duracion ?? null,
        guion: b.guion ?? null,
        config:
          (typeof b.config === "object" && b.config !== null ? b.config : params.fallbackConfig) as Record<
            string,
            unknown
          >,
      });
      return "listo";
    }
    if (est === "ERROR") {
      params.onUpdate({ estado: est });
      return "error";
    }
  }
  return "timeout";
}

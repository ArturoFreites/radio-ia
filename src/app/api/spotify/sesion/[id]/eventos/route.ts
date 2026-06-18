import { redisSubscribe } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: sesionId } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return new Response(JSON.stringify({ error: "token requerido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sesion = await prisma.spotifySesion.findFirst({
    where: { id: sesionId, panelToken: token },
    select: { id: true },
  });
  if (!sesion) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const channel = `spotify:sesion:${sesionId}`;

  const stream = new ReadableStream({
    async start(controller) {
      let unsub: (() => Promise<void>) | null = null;
      try {
        unsub = await redisSubscribe(channel, (data) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        });
      } catch {
        controller.close();
        return;
      }

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 15_000);

      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        void unsub?.();
        try {
          controller.close();
        } catch {
          /* ya cerrado */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

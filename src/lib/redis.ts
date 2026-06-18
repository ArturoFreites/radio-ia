import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

export function getRedis(): Redis {
  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
  }
  return globalForRedis.redis;
}

export async function redisPublish(channel: string, data: unknown): Promise<void> {
  await getRedis().publish(channel, JSON.stringify(data));
}

export async function redisSubscribe(
  channel: string,
  callback: (data: unknown) => void,
): Promise<() => Promise<void>> {
  const sub = getRedis().duplicate();
  await new Promise<void>((resolve, reject) => {
    sub.subscribe(channel, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  const handler = (_ch: string, message: string): void => {
    try {
      callback(JSON.parse(message) as unknown);
    } catch {
      /* mensaje no JSON */
    }
  };
  sub.on("message", handler);
  return async () => {
    sub.off("message", handler);
    await sub.unsubscribe(channel);
    sub.disconnect();
  };
}

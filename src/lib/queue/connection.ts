import Redis from "ioredis";

let connection: Redis | null = null;

export function getQueueConnection(): Redis {
  if (!connection) {
    connection = new Redis(process.env.REDIS_URL ?? "redis://redis:6379", {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}

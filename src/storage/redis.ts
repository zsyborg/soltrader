import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | undefined;

export async function getRedisClient(redisUrl = process.env.REDIS_URL): Promise<RedisClientType> {
  if (!redisUrl) throw new Error("Missing required environment variable: REDIS_URL");
  if (!client) {
    client = createClient({ url: redisUrl });
    client.on("error", (error) => console.error("Redis client error", error));
  }
  if (!client.isOpen) await client.connect();
  return client;
}

export async function checkRedis(redisUrl?: string): Promise<void> {
  const redis = await getRedisClient(redisUrl);
  const result = await redis.ping();
  if (result !== "PONG") throw new Error(`Unexpected Redis ping response: ${result}`);
}

export async function closeRedis(): Promise<void> {
  if (client?.isOpen) await client.quit();
  client = undefined;
}

import { Redis } from "ioredis";
import { env } from "./env";

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;
  _redis = new Redis(env.REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: null, // BullMQ recommends this
  });

  _redis.on("connect", () => console.log("🟢 Redis connected"));
  _redis.on("error", (err) => console.error("🔴 Redis error:", err));

  return _redis;
}

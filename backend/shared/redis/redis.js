import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const memoryStore = new Map();

let redis = null;
try {
  redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 2) return null;
      return 200;
    },
    lazyConnect: true
  });

  redis.connect().catch((err) => {
    console.warn("⚠️ Redis container not connected, using in-memory session fallback:", err.message);
  });

  redis.on("error", () => {
    // Silence unhandled error events when local Redis docker container is offline
  });
} catch (err) {
  console.warn("⚠️ Redis initialization warning:", err.message);
}

const redisClient = {
  async set(key, value, mode, duration) {
    try {
      if (redis && redis.status === "ready") {
        return await redis.set(key, value, mode, duration);
      }
    } catch (e) {}
    memoryStore.set(key, value);
    if (duration) {
      setTimeout(() => memoryStore.delete(key), duration * 1000);
    }
    return "OK";
  },
  async get(key) {
    try {
      if (redis && redis.status === "ready") {
        const val = await redis.get(key);
        if (val !== null) return val;
      }
    } catch (e) {}
    return memoryStore.get(key) || null;
  },
  async del(key) {
    try {
      if (redis && redis.status === "ready") {
        await redis.del(key);
      }
    } catch (e) {}
    memoryStore.delete(key);
    return 1;
  },
  on(event, cb) {
    if (redis) redis.on(event, cb);
  }
};

export default redisClient;
import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

redis.on('connect', () => console.info('[redis] connect'));
redis.on('ready', () => console.info('[redis] ready'));
redis.on('close', () => console.info('[redis] close'));
redis.on('reconnecting', (delay: number) => console.info('[redis] reconnecting in', delay));

export async function acquireLock(key: string, ttlSec = 5): Promise<boolean> {
  const result = await (redis as any).set(key, '1', 'NX', 'EX', ttlSec);
  return result === 'OK' || result === 'OK\r\n';
}

export async function releaseLock(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (err) {
    console.error(err);
  }
}
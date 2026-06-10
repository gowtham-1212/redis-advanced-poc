import redisClient from './redis.service.js';

export class LockService {
  /**
   * Acquires a lock for a specific resource with retries.
   */
  static async acquireLock(
    resource: string, 
    ttl: number = 5000, 
    retries: number = 3, 
    delay: number = 100
  ): Promise<string | null> {
    const lockKey = `lock:${resource}`;
    const token = Math.random().toString(36).substring(2) + Date.now();

    // for (let i = 0; i <= retries; i++) {
      // Use Case 5: SET NX PX
      // We use the raw 'set' command with arguments to ensure atomicity
      const result = await redisClient.set(lockKey, token, 'PX', ttl, 'NX');

      if (result === 'OK') {
        return token;
      }

      // If not the last retry, wait with slight jitter
    //   if (i < retries) {
    //     const jitter = Math.floor(Math.random() * 50);
    //     await new Promise(resolve => setTimeout(resolve, delay + jitter));
    //   }
    // }

    return null;
  }

  /**
   * Releases a lock safely using a Lua script.
   */
  static async releaseLock(resource: string, token: string): Promise<boolean> {
    const lockKey = `lock:${resource}`;

    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await redisClient.eval(luaScript, 1, lockKey, token);
      return result === 1;
    } catch (err) {
      console.error('Error releasing lock:', err);
      return false;
    }
  }
}

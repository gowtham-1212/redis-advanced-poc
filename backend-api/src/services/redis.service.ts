import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Use Case: High Availability with Sentinel (Local Ports)
const redisClient = new Redis({
  sentinels: [
    { host: '127.0.0.1', port: 26379 },
    { host: '127.0.0.1', port: 26380 },
    { host: '127.0.0.1', port: 26381 },
  ],
  name: 'mymaster',
  username: process.env.REDIS_USER || 'api_user',
  password: process.env.REDIS_PASSWORD || 'api_pass',
  sentinelPassword: 'admin_pass',
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redisClient.on('connect', () => {
  console.log('Successfully connected to Redis');
});

export default redisClient;

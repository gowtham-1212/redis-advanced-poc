import { FastifyRequest, FastifyReply } from 'fastify';
import redisClient from '../services/redis.service.js';

export const rateLimiter = async (request: FastifyRequest, reply: FastifyReply) => {
  const ip = request.ip;
  const key = `ratelimit:${ip}`;
  
  const current = await redisClient.incr(key);
  
  if (current === 1) {
    // First request in the window, set expiry to 60 seconds
    await redisClient.expire(key, 60);
  }
  
  if (current > 10) {
    reply.status(429).send({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Try again in a minute.',
    });
  }
};

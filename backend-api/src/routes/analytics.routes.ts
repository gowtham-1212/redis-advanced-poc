import { FastifyInstance } from 'fastify';
import redisClient from '../services/redis.service.js';

export default async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.post('/analytics/view', async (request: any, reply) => {
    const { userId } = request.body;
    if (!userId) return reply.status(400).send({ error: 'userId is required' });

    const today = new Date().toISOString().split('T')[0];
    const key = `analytics:visitors:${today}`;

    // Use Case 3: HyperLogLog for Unique Visitors
    const reutn = await redisClient.pfadd(key, userId);
    const count = await redisClient.pfcount(key);
    
    return reply.send({ success: true, uniqueVisitorsToday: count });
  });

  fastify.get('/analytics/stats', async (request, reply) => {
    const today = new Date().toISOString().split('T')[0];
    const key = `analytics:visitors:${today}`;
    const count = await redisClient.pfcount(key);
    return reply.send({ uniqueVisitorsToday: count });
  });
}

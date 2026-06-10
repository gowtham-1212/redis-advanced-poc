import Fastify from 'fastify';
import dotenv from 'dotenv';
import { connectMongo } from './services/mongo.service.js';
import redisClient from './services/redis.service.js';
import productRoutes from './routes/product.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import dealRoutes from './routes/deal.routes.js';
import { rateLimiter } from './hooks/rateLimiter.hook.js';
import { ipWhitelist } from './hooks/ipWhitelist.hook.js';

dotenv.config();

const fastify = Fastify({ logger: true });

// Security Hooks
fastify.addHook('preHandler', ipWhitelist);
// fastify.addHook('preHandler', rateLimiter);


// Register Routes
fastify.register(productRoutes, { prefix: '/api' });
fastify.register(analyticsRoutes, { prefix: '/api' });
fastify.register(dealRoutes, { prefix: '/api' });

const start = async () => {
  try {
    await connectMongo();
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server is running on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful Shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  await fastify.close();
  await redisClient.quit();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();

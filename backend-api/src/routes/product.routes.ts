import { FastifyInstance } from 'fastify';
import Product from '../models/product.model.js';
import redisClient from '../services/redis.service.js';

export default async function productRoutes(fastify: FastifyInstance) {
  fastify.get('/products/:id', async (request: any, reply) => {
    const { id } = request.params;
    const cacheKey = `product:${id}`;

    // Use Case 1: Check Cache
    const cachedProduct = await redisClient.get(cacheKey);
    if (cachedProduct) {
      return reply.send({
        source: 'cache',
        data: JSON.parse(cachedProduct),
      });
    }

    // Cache Miss: Fetch from MongoDB
    const product = await Product.findById(id);
    if (!product) {
      return reply.status(404).send({ error: 'Product not found' });
    }

    // Save to Redis with 5 min TTL (300 seconds)
    await redisClient.set(cacheKey, JSON.stringify(product), 'EX', 300);

    return reply.send({
      source: 'database',
      data: product,
    });
  });

  // Helper route to seed data
  fastify.post('/products/seed', async (request, reply) => {
    const products = [
      { name: 'iPhone 15 Pro', description: 'Latest Apple flagship', price: 999, stock: 10 },
      { name: 'Samsung S24 Ultra', description: 'AI powered flagship', price: 1199, stock: 5 },
      { name: 'MacBook Air M3', description: 'Thin and light', price: 1099, stock: 20 },
    ];
    await Product.deleteMany({});
    const created = await Product.insertMany(products);
    return reply.send(created);
  });

  // New route to get all products (for UI refresh)
  fastify.get('/products', async (request, reply) => {
    const products = await Product.find({});
    return reply.send(products);
  });
}

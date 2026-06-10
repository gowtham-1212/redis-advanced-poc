import { FastifyInstance } from 'fastify';
import redisClient from '../services/redis.service.js';
import Product from '../models/product.model.js';
import { LockService } from '../services/lock.service.js';

export default async function dealRoutes(fastify: FastifyInstance) {
  const LEADERBOARD_KEY = 'deals:leaderboard';

  // Use Case 5: Flash Sale Checkout with Distributed Locking
  fastify.post('/deals/checkout', async (request: any, reply) => {
    const { productId, userId } = request.body;
    
    // 1. Attempt to acquire lock for this specific product
    const lockToken = await LockService.acquireLock(productId);

    console.log(lockToken, "lockToken")
    
    if (!lockToken) {
      return reply.status(423).send({ 
        error: 'Busy', 
        message: 'Too many people are trying to buy this. Please try again in a second.' 
      });
    }

    try {
      // 2. Critical Section: Check inventory and decrement
      const product = await Product.findById(productId);
      
      if (!product) {
        return reply.status(404).send({ error: 'Product not found' });
      }

      if (product.stock <= 0) {
        return reply.status(400).send({ error: 'Out of Stock', message: 'Sorry, this deal is gone!' });
      }

      // Decrement stock in MongoDB
      product.stock -= 1;
      await product.save();

      // 3. Update Leaderboard (Use Case 4)
      await redisClient.zincrby(LEADERBOARD_KEY, 1, productId);

      return reply.send({ 
        success: true, 
        message: 'Order placed successfully!',
        remainingStock: product.stock 
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    } finally {
      // 4. Always release the lock
      await LockService.releaseLock(productId, lockToken);
    }
  });

  // Use Case 4: Fetch Trending Leaderboard
  fastify.get('/deals/leaderboard', async (request, reply) => {
    // Get top 5 products (Reverse range because higher score = more popular)
    const topDeals = await redisClient.zrevrange(LEADERBOARD_KEY, 0, 4, 'WITHSCORES');
    
    console.log(topDeals,"topDeals")

    // Format the flat array [id1, score1, id2, score2...] into array of objects
    const formatted = [];
    for (let i = 0; i < topDeals.length; i += 2) {
      formatted.push({
        productId: topDeals[i],
        salesCount: parseInt(topDeals[i + 1]),
      });
    }

    return reply.send(formatted);
  });

  // Helper route to simulate a sale (not the checkout yet)
  fastify.post('/deals/simulate-sale', async (request: any, reply) => {
    const { productId } = request.body;
    
    // Use Case 4: Increment score in Sorted Set
    await redisClient.zincrby(LEADERBOARD_KEY, 1, productId);
    
    return reply.send({ success: true });
  });
}

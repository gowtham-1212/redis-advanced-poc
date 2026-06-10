# Redis Advanced POC: Flash Sale Platform

This project is a comprehensive Proof of Concept (POC) demonstrating production-grade Redis use cases, ranging from basic caching to advanced distributed systems patterns.

## Architecture
The system simulates a high-traffic flash sale platform where performance and concurrency are critical.

### Use Cases
1.  **Beginner: String Caching & TTL** - Product catalog caching to reduce database load.
2.  **Intermediate: Rate Limiting** - Atomic counters to prevent API abuse (10 req/min per IP).
3.  **Intermediate: HyperLogLog** - Unique visitor tracking with minimal memory footprint.
4.  **Advanced: Sorted Sets (ZSET)** - Real-time leaderboard for trending deals.
5.  **Advanced: Distributed Locking** - Concurrency control for flash sale checkout to prevent overselling.

## Tech Stack
- **Backend**: Fastify (TypeScript), Node.js, `ioredis`, `mongoose`.
- **Frontend**: React (TypeScript, Vite), TailwindCSS.
- **Infrastructure**: Docker, Redis Stack (with RedisInsight), MongoDB.

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js (v18+)
- npm or pnpm

### Setup
1.  **Spin up infrastructure**:
    ```bash
    docker-compose up -d
    ```
2.  **Backend Setup**:
    ```bash
    cd backend-api
    npm install
    npm run dev
    ```
3.  **Frontend Setup**:
    ```bash
    cd frontend-ui
    npm install
    npm run dev
    ```

## Testing Guide

### 1. Rate Limiting (Use Case 2)
Simulate rapid requests from the same IP:
```bash
for i in {1..12}; do curl -i http://localhost:3000/api/products/1; sleep 1; done
```
*Expected: The 11th and 12th requests should return HTTP 429.*

### 2. Distributed Locking & Race Conditions (Use Case 5)
Simulate concurrent checkout requests for an item with low stock:
```bash
# Assuming product 'deal_1' has 5 units.
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/deals/checkout \
    -H "Content-Type: application/json" \
    -d '{"productId": "deal_1", "userId": "user_'$i'"}' &
done
wait
```
*Expected: Only 5 requests should succeed; the rest should fail with "Out of Stock" or "Could not acquire lock".*

### 3. HyperLogLog Unique Visitors (Use Case 3)
```bash
curl -X POST http://localhost:3000/api/analytics/view -H "Content-Type: application/json" -d '{"userId": "user_1"}'
curl -X POST http://localhost:3000/api/analytics/view -H "Content-Type: application/json" -d '{"userId": "user_1"}'
curl -X POST http://localhost:3000/api/analytics/view -H "Content-Type: application/json" -d '{"userId": "user_2"}'
# Unique count should be 2.
```

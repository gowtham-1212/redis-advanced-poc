import { FastifyRequest, FastifyReply } from 'fastify';

const ALLOWED_IPS = ['127.0.0.1', '::1'];

export const ipWhitelist = async (request: FastifyRequest, reply: FastifyReply) => {
  const clientIp = request.ip;
  
  // Use Case: IP Whitelisting
  if (!ALLOWED_IPS.includes(clientIp)) {
    console.log(`❌ Access Denied for IP: ${clientIp}`);
    return reply.status(403).send({
      error: 'Forbidden',
      message: `Your IP (${clientIp}) is not whitelisted to access this flash sale.`,
    });
  }
  
  console.log(`✅ Access Granted for IP: ${clientIp}`);
};

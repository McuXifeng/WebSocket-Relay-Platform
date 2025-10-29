import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getEndpoint() {
  try {
    const endpoints = await prisma.endpoint.findMany({
      take: 1,
      orderBy: { created_at: 'desc' },
    });

    if (endpoints.length > 0) {
      console.log('Endpoint ID:', endpoints[0].endpoint_id);
      console.log('Database UUID:', endpoints[0].id);
      console.log('Endpoint Name:', endpoints[0].name);
      console.log('WebSocket URL:', `ws://localhost:3001/ws/${endpoints[0].endpoint_id}`);
    } else {
      console.log('No endpoints found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getEndpoint();

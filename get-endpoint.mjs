import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getEndpoint() {
  try {
    const endpoint = await prisma.endpoint.findFirst();
    if (endpoint) {
      console.log(`Found endpoint_id: ${endpoint.endpoint_id}`);
    } else {
      console.log('No endpoints found in database');
    }
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getEndpoint();

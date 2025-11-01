import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const endpoints = await prisma.endpoint.findMany({
    where: {
      forwarding_mode: 'JSON',
      user_id: 'b93281db-15d4-40dd-a938-669c3c68599b', // admin
    },
  });

  console.log(`找到 ${endpoints.length} 个 JSON 模式的端点:\n`);
  endpoints.forEach((ep, i) => {
    console.log(`[${i + 1}] ${ep.name}`);
    console.log(`    ID: ${ep.id}`);
    console.log(`    endpoint_id: ${ep.endpoint_id}`);
    console.log(`    转发模式: ${ep.forwarding_mode}`);
    console.log();
  });
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());

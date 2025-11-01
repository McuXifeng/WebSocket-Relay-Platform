import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const endpointId = '37935127-a03b-480d-8d0d-1ffe96abd74e';

  const endpoint = await prisma.endpoint.findUnique({
    where: { id: endpointId },
  });

  console.log('端点信息:', {
    id: endpoint.id,
    endpoint_id: endpoint.endpoint_id,
    name: endpoint.name,
    forwarding_mode: endpoint.forwarding_mode,  // 这个很重要！
    custom_header: endpoint.custom_header,
  });
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());

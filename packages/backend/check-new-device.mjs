import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查询最近创建的设备
  const devices = await prisma.device.findMany({
    where: {
      endpoint_id: '0d8ec070-20e4-45fb-b57a-77dcfea3c404',  // test-ep-002
    },
    orderBy: { created_at: 'desc' },
    take: 5,
  });

  console.log(`找到 ${devices.length} 个设备:\n`);
  devices.forEach((d, idx) => {
    console.log(`[${idx + 1}] ${d.device_id} (${d.custom_name})`);
    console.log(`    ID: ${d.id}`);
    console.log(`    创建时间: ${d.created_at}`);
    console.log(`    最后连接: ${d.last_connected_at}`);
    console.log();
  });

  // 查询设备数据
  if (devices.length > 0) {
    const deviceId = devices[0].id;
    const data = await prisma.deviceData.findMany({
      where: { device_id: deviceId },
      orderBy: { timestamp: 'desc' },
      take: 5,
    });

    console.log(`最新设备的数据 (共 ${data.length} 条):\n`);
    data.forEach((d, idx) => {
      console.log(`[${idx + 1}] ${d.data_key} = ${d.data_value}`);
      console.log(`    时间: ${d.timestamp}`);
    });
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());

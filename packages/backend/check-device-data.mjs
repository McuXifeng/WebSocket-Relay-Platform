/**
 * 检查设备数据
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 设备ID
  const deviceId = '96344914-1a6a-4b3f-9458-1b6ea4396b21';

  console.log('查询设备信息...');
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
  });

  if (!device) {
    console.log('❌ 设备不存在');
    return;
  }

  console.log('✅ 设备信息:',{
    id: device.id,
    device_id: device.device_id,
    custom_name: device.custom_name,
    last_connected_at: device.last_connected_at,
  });

  console.log('\n查询设备数据（最近10条）...');
  const deviceData = await prisma.deviceData.findMany({
    where: { device_id: deviceId },
    orderBy: { timestamp: 'desc' },
    take: 10,
  });

  if (deviceData.length === 0) {
    console.log('❌ 设备无数据');
  } else {
    console.log(`✅ 找到 ${deviceData.length} 条数据：`);
    deviceData.forEach((data, index) => {
      console.log(`\n[${index + 1}]`, {
        data_key: data.data_key,
        data_value: data.data_value,
        data_type: data.data_type,
        timestamp: data.timestamp,
      });
    });
  }

  console.log('\n查询告警规则...');
  const rules = await prisma.alertRule.findMany({
    where: { device_id: deviceId },
  });

  if (rules.length === 0) {
    console.log('❌ 无告警规则');
  } else {
    console.log(`✅ 找到 ${rules.length} 条规则：`);
    rules.forEach((rule, index) => {
      console.log(`\n[${index + 1}]`, {
        id: rule.id,
        rule_name: rule.rule_name,
        data_key: rule.data_key,
        operator: rule.operator,
        threshold: rule.threshold,
        alert_level: rule.alert_level,
        enabled: rule.enabled,
      });
    });
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

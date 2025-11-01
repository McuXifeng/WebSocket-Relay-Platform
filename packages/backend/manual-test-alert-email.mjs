/**
 * 手动测试告警邮件通知
 * 直接操作数据库，绕过 WebSocket
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================');
  console.log('告警邮件通知手动测试 (Story 6.5)');
  console.log('========================================\n');

  // 使用现有设备 (micu)
  const deviceId = '96344914-1a6a-4b3f-9458-1b6ea4396b21';
  const endpointId = '37935127-a03b-480d-8d0d-1ffe96abd74e';

  console.log('[1/5] 清理旧数据...');
  await prisma.deviceData.deleteMany({
    where: { device_id: deviceId },
  });
  console.log('✅ 旧数据已清理\n');

  console.log('[2/5] 插入新的设备数据...');
  const now = new Date();
  await prisma.deviceData.createMany({
    data: [
      {
        device_id: deviceId,
        data_key: 'temperature',
        data_value: '60.5',
        data_type: 'number',
        timestamp: now,
      },
      {
        device_id: deviceId,
        data_key: 'humidity',
        data_value: '95.0',
        data_type: 'number',
        timestamp: now,
      },
    ],
  });
  console.log('✅ 新数据已插入');
  console.log('   temperature = 60.5°C');
  console.log('   humidity = 95.0%');
  console.log(`   timestamp = ${now.toISOString()}\n`);

  console.log('[3/5] 创建告警规则...');
  // 先清理同名规则
  await prisma.alertRule.deleteMany({
    where: {
      device_id: deviceId,
      rule_name: '手动测试 - 温度过高',
    },
  });

  const rule = await prisma.alertRule.create({
    data: {
      user_id: 'b93281db-15d4-40dd-a938-669c3c68599b', // admin
      endpoint_id: endpointId,
      device_id: deviceId,
      rule_name: '手动测试 - 温度过高',
      data_key: 'temperature',
      operator: '>',
      threshold: '50',
      alert_level: 'critical',
      enabled: true,
    },
  });
  console.log('✅ 告警规则已创建');
  console.log(`   规则ID: ${rule.id}`);
  console.log(`   条件: temperature > 50`);
  console.log(`   当前值: 60.5 (应触发)\n`);

  console.log('[4/5] 等待定时任务触发告警...');
  console.log('   定时任务每分钟执行一次');
  console.log('   最多等待 90 秒...\n');

  let triggered = false;
  for (let i = 0; i < 18; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    process.stdout.write(`\r   已等待 ${(i + 1) * 5} 秒...`);

    const alerts = await prisma.alertHistory.findMany({
      where: { alert_rule_id: rule.id },
      orderBy: { triggered_at: 'desc' },
      take: 1,
    });

    if (alerts.length > 0) {
      console.log(' ✅\n');
      triggered = true;

      const alert = alerts[0];
      console.log('告警已触发！');
      console.log(`   触发时间: ${alert.triggered_at.toISOString()}`);
      console.log(`   触发值: ${alert.triggered_value}`);
      console.log(`   阈值: ${alert.threshold}`);
      console.log(`   告警级别: ${alert.alert_level}`);
      console.log(`   邮件发送: ${alert.email_sent ? '✅ 是' : '❌ 否'}\n`);

      console.log('========================================');
      if (alert.email_sent) {
        console.log('✅✅✅ 邮件通知发送成功！');
        console.log('========================================\n');
        console.log('📧 请检查邮箱: 3531313387@qq.com');
        console.log('');
        console.log('邮件信息:');
        console.log('  主题: [严重] 手动测试 - 温度过高 - 设备告警通知');
        console.log('  级别: 严重 (红色)');
        console.log('  内容: temperature=60.5 > 50');
        console.log('');
        console.log('🎉 Story 6.5 告警邮件通知功能验证通过！');
      } else {
        console.log('⚠️  邮件通知未发送');
        console.log('========================================');
        console.log('   查看后端日志: tail -f packages/backend/logs/*.log');
      }
      break;
    }
  }

  if (!triggered) {
    console.log(' ⏰\n');
    console.log('⚠️  告警未触发（可能需要等待更长时间）');
    console.log('   查看日志: tail -f packages/backend/logs/combined.log | grep Alert');
  }

  console.log('\n清理资源:');
  console.log(`   await prisma.alertRule.delete({ where: { id: '${rule.id}' } });`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('\n❌ 错误:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

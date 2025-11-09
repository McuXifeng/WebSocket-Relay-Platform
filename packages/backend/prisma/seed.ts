import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始数据库初始化...');

  // 创建初始管理员账户
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      password_hash: adminPassword,
      is_admin: true,
    },
  });

  console.log('✅ 管理员账户已创建');
  console.log(`   用户名: admin`);
  console.log(`   邮箱: admin@example.com`);
  console.log(`   密码: admin123`);
  console.log(`   ID: ${admin.id}`);

  // 创建测试授权码
  const inviteCodes = [];
  for (let i = 0; i < 5; i++) {
    const code = nanoid(10); // 生成 10 位随机码
    const inviteCode = await prisma.inviteCode.upsert({
      where: { code },
      update: {},
      create: {
        code,
        created_by: admin.id,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 天后过期
      },
    });
    inviteCodes.push(inviteCode);
  }

  console.log('\n✅ 测试授权码已创建:');
  inviteCodes.forEach((ic, index) => {
    console.log(`   ${index + 1}. ${ic.code} (过期时间: ${ic.expires_at?.toISOString()})`);
  });

  // 创建测试端点
  const endpoint1 = await prisma.endpoint.upsert({
    where: { endpoint_id: 'test-ep-001' },
    update: {},
    create: {
      endpoint_id: 'test-ep-001',
      name: '测试端点 1',
      user_id: admin.id,
    },
  });

  const endpoint2 = await prisma.endpoint.upsert({
    where: { endpoint_id: 'test-ep-002' },
    update: {},
    create: {
      endpoint_id: 'test-ep-002',
      name: '测试端点 2',
      user_id: admin.id,
    },
  });

  console.log('\n✅ 测试端点已创建:');
  console.log(`   1. ${endpoint1.name} (ID: ${endpoint1.endpoint_id})`);
  console.log(`   2. ${endpoint2.name} (ID: ${endpoint2.endpoint_id})`);

  // Epic 10 Story 10.2: 创建封禁功能测试数据
  console.log('\n🚫 开始创建封禁功能测试数据...');

  // 创建被封禁的测试用户
  const bannedUserPassword = await bcrypt.hash('banned123', 10);
  const bannedUser = await prisma.user.upsert({
    where: { username: 'banned_test_user' },
    update: {},
    create: {
      username: 'banned_test_user',
      email: 'banned@test.com',
      password_hash: bannedUserPassword,
      is_admin: false,
      is_active: false,
      banned_at: new Date(),
      banned_reason: '测试封禁功能 - 违反平台使用规则',
      banned_by: admin.id,
    },
  });

  console.log('\n✅ 被封禁测试用户已创建:');
  console.log(`   用户名: banned_test_user`);
  console.log(`   邮箱: banned@test.com`);
  console.log(`   状态: 已封禁 (is_active=false)`);
  console.log(`   封禁原因: ${bannedUser.banned_reason}`);

  // 创建被禁用的测试端点
  const disabledEndpoint = await prisma.endpoint.upsert({
    where: { endpoint_id: 'test-ep-999' },
    update: {},
    create: {
      endpoint_id: 'test-ep-999',
      name: '被禁用测试端点',
      user_id: admin.id,
      is_disabled: true,
      disabled_at: new Date(),
      disabled_reason: '测试禁用功能 - 异常流量检测',
      disabled_by: admin.id,
    },
  });

  console.log('\n✅ 被禁用测试端点已创建:');
  console.log(`   端点名称: ${disabledEndpoint.name}`);
  console.log(`   端点ID: ${disabledEndpoint.endpoint_id}`);
  console.log(`   状态: 已禁用 (is_disabled=true)`);
  console.log(`   禁用原因: ${disabledEndpoint.disabled_reason}`);

  // 创建封禁审计日志
  const banLogs = await prisma.banLog.createMany({
    data: [
      {
        target_type: 'user',
        target_id: bannedUser.id,
        action: 'ban',
        reason: '测试封禁功能 - 违反平台使用规则',
        operator_id: admin.id,
      },
      {
        target_type: 'endpoint',
        target_id: disabledEndpoint.id,
        action: 'disable',
        reason: '测试禁用功能 - 异常流量检测',
        operator_id: admin.id,
      },
    ],
  });

  console.log('\n✅ 封禁审计日志已创建:');
  console.log(`   用户封禁日志: 1条 (target_type='user', action='ban')`);
  console.log(`   端点禁用日志: 1条 (target_type='endpoint', action='disable')`);
  console.log(`   总计: ${banLogs.count}条审计记录`);

  console.log('\n🎉 数据库初始化完成！');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ 数据库初始化失败:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

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

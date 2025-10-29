import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

/**
 * 检查数据库是否已初始化
 * 如果没有数据,直接在代码中初始化(不依赖外部 seed 脚本)
 */
export async function checkAndSeed(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 检查数据库初始化状态...');

    // 检查是否有用户数据
    const userCount = await prisma.user.count();

    if (userCount === 0) {
      console.log('⚠️  数据库为空,开始自动初始化...');
      console.log('');

      // 直接在代码中初始化数据(不依赖外部脚本)
      console.log('🌱 创建初始管理员账户...');

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
      console.log('\n🔑 创建测试授权码...');
      const inviteCodes = [];
      for (let i = 0; i < 5; i++) {
        const code = nanoid(10);
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

      console.log('✅ 测试授权码已创建:');
      inviteCodes.forEach((ic, index) => {
        console.log(`   ${index + 1}. ${ic.code}`);
      });

      // 创建测试端点
      console.log('\n🔗 创建测试端点...');
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

      console.log('✅ 测试端点已创建:');
      console.log(`   1. ${endpoint1.name} (ID: ${endpoint1.endpoint_id})`);
      console.log(`   2. ${endpoint2.name} (ID: ${endpoint2.endpoint_id})`);

      console.log('\n🎉 数据库自动初始化完成！\n');
    } else {
      console.log(`✅ 数据库已初始化 (${userCount} 个用户)\n`);
    }
  } catch (error) {
    console.error('❌ 检查数据库状态失败:', error);
    // 不抛出错误,允许服务器继续启动
    console.warn('⚠️  服务器将继续启动,但数据库可能未初始化');
    console.warn('⚠️  请手动运行: npx prisma db seed\n');
  } finally {
    await prisma.$disconnect();
  }
}

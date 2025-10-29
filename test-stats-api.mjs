/**
 * 手动测试端点统计 API
 */

import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// JWT Secret (应该和 backend .env 中的一致)
const JWT_SECRET = 'your-secret-key-change-this-in-production';

async function testStatsAPI() {
  try {
    console.log('开始测试端点统计 API...\n');

    // 1. 创建测试用户
    console.log('1. 创建测试用户...');
    const user = await prisma.user.upsert({
      where: { username: 'stats_manual_testuser' },
      update: {},
      create: {
        username: 'stats_manual_testuser',
        email: 'stats_manual@example.com',
        password_hash: 'hashed-password',
      },
    });
    console.log(`✓ 用户已创建: ${user.username} (${user.id})\n`);

    // 2. 生成 JWT Token
    console.log('2. 生成 JWT Token...');
    const token = jwt.sign(
      { userId: user.id, username: user.username, isAdmin: false },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log(`✓ Token: ${token.substring(0, 50)}...\n`);

    // 3. 创建测试端点
    console.log('3. 创建测试端点...');
    const endpoint = await prisma.endpoint.create({
      data: {
        endpoint_id: 'manual-test-01',
        name: '手动测试端点',
        user_id: user.id,
      },
    });
    console.log(`✓ 端点已创建: ${endpoint.name} (${endpoint.id})\n`);

    // 4. 创建统计数据
    console.log('4. 创建端点统计数据...');
    const stats = await prisma.endpointStats.create({
      data: {
        endpoint_id: endpoint.id,
        current_connections: 3,
        total_connections: 25,
        total_messages: 100,
      },
    });

    // 更新端点的 last_active_at
    await prisma.endpoint.update({
      where: { id: endpoint.id },
      data: { last_active_at: new Date() },
    });
    console.log(`✓ 统计数据已创建\n`);

    // 5. 测试 API - 获取统计数据
    console.log('5. 测试 API: GET /api/endpoints/:id/stats');
    const url = `http://localhost:3000/api/endpoints/${endpoint.id}/stats`;
    console.log(`   URL: ${url}`);
    console.log(`   使用以下 curl 命令测试:\n`);
    console.log(`   curl -X GET "${url}" \\`);
    console.log(`     -H "Authorization: Bearer ${token}" \\`);
    console.log(`     -H "Content-Type: application/json"`);
    console.log(`\n`);

    // 使用 fetch 测试 API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.status === 200) {
      console.log('✓ API 调用成功 (200 OK)');
      console.log('响应数据:', JSON.stringify(data, null, 2));

      // 验证数据
      if (
        data.data.current_connections === 3 &&
        data.data.total_connections === 25 &&
        data.data.total_messages === 100
      ) {
        console.log('\n✓ 数据验证通过!\n');
      } else {
        console.log('\n✗ 数据验证失败!\n');
      }
    } else {
      console.log(`✗ API 调用失败 (${response.status})`);
      console.log('响应数据:', JSON.stringify(data, null, 2));
    }

    // 6. 测试默认值场景
    console.log('\n6. 测试默认值场景...');
    const endpoint2 = await prisma.endpoint.create({
      data: {
        endpoint_id: 'manual-test-02',
        name: '无统计数据端点',
        user_id: user.id,
      },
    });

    const url2 = `http://localhost:3000/api/endpoints/${endpoint2.id}/stats`;
    const response2 = await fetch(url2, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data2 = await response2.json();

    if (response2.status === 200) {
      console.log('✓ API 调用成功 (200 OK)');
      console.log('响应数据:', JSON.stringify(data2, null, 2));

      // 验证默认值
      if (
        data2.data.current_connections === 0 &&
        data2.data.total_connections === 0 &&
        data2.data.total_messages === 0 &&
        data2.data.last_active_at === null
      ) {
        console.log('\n✓ 默认值验证通过!\n');
      } else {
        console.log('\n✗ 默认值验证失败!\n');
      }
    } else {
      console.log(`✗ API 调用失败 (${response2.status})`);
      console.log('响应数据:', JSON.stringify(data2, null, 2));
    }

    // 清理测试数据
    console.log('\n7. 清理测试数据...');
    await prisma.endpointStats.deleteMany({
      where: { endpoint_id: { in: [endpoint.id, endpoint2.id] } },
    });
    await prisma.endpoint.deleteMany({ where: { user_id: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log('✓ 测试数据已清理\n');

    console.log('=== 测试完成 ===');
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testStatsAPI();

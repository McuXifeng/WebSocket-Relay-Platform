/**
 * 测试授权码 API 的返回数据结构
 */

const API_BASE_URL = 'http://localhost:3000/api';

// 先登录获取 Token
async function login() {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Login failed: ${data.message}`);
  }

  console.log('✅ 登录成功');
  console.log('登录响应结构:', JSON.stringify(data, null, 2));

  // 尝试不同的路径提取 token
  const token = data.data?.access_token || data.access_token || data.data?.token || data.token;
  if (!token) {
    throw new Error('无法从响应中提取 token');
  }

  console.log('Token:', token);
  return token;
}

// 创建授权码
async function createInviteCode(token) {
  const response = await fetch(`${API_BASE_URL}/admin/invite-codes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  const data = await response.json();
  console.log('\n📝 创建授权码响应结构:');
  console.log(JSON.stringify(data, null, 2));

  return data;
}

// 获取授权码列表
async function getInviteCodes(token) {
  const response = await fetch(`${API_BASE_URL}/admin/invite-codes`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  console.log('\n📋 获取授权码列表响应结构:');
  console.log(JSON.stringify(data, null, 2));

  return data;
}

async function main() {
  try {
    // 1. 登录
    const token = await login();

    // 2. 创建授权码
    await createInviteCode(token);

    // 3. 获取授权码列表
    await getInviteCodes(token);
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

main();

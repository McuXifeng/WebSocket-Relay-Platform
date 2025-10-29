#!/usr/bin/env node

/**
 * 无感刷新功能自动化测试脚本
 *
 * 测试场景：
 * 1. 设备连接后，3秒内前端设备列表自动更新
 * 2. 发送消息后，5秒内前端历史消息自动更新
 * 3. 设备断开后，33秒内前端设备状态更新为离线
 */

import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

// 配置
const WS_URL = 'ws://localhost:3001';
const API_URL = 'http://localhost:3000/api';
const TEST_ENDPOINT_ID = 'd4ZO8QbitG'; // 替换为实际的 endpoint_id
const TEST_DEVICE_ID = `test-device-${Date.now()}`;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 获取 admin 用户的 token
 */
async function getAuthToken() {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });

    if (!response.ok) {
      throw new Error(`登录失败: ${response.status}`);
    }

    const data = await response.json();
    return data.data.token;
  } catch (error) {
    log(`❌ 获取 token 失败: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * 查询设备列表
 */
async function getDevices(token, endpointUuid) {
  try {
    const response = await fetch(`${API_URL}/endpoints/${endpointUuid}/devices`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`获取设备列表失败: ${response.status}`);
    }

    const data = await response.json();
    return data.data.devices;
  } catch (error) {
    log(`❌ 查询设备列表失败: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * 查询历史消息
 */
async function getMessages(token, endpointUuid) {
  try {
    const response = await fetch(`${API_URL}/endpoints/${endpointUuid}/messages`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`获取历史消息失败: ${response.status}`);
    }

    const data = await response.json();
    return data.data.messages;
  } catch (error) {
    log(`❌ 查询历史消息失败: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * 获取端点的数据库 UUID
 */
async function getEndpointUuid(token, endpointId) {
  try {
    const response = await fetch(`${API_URL}/endpoints`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`获取端点列表失败: ${response.status}`);
    }

    const data = await response.json();
    const endpoint = data.data.endpoints.find(ep => ep.endpoint_id === endpointId);

    if (!endpoint) {
      throw new Error(`未找到端点: ${endpointId}`);
    }

    return endpoint.id;
  } catch (error) {
    log(`❌ 获取端点 UUID 失败: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * 测试场景 1: 设备连接后自动更新
 */
async function testDeviceConnection(token, endpointUuid) {
  log('\n📋 测试场景 1: 设备连接后自动更新', 'cyan');
  log('─'.repeat(60), 'cyan');

  // 1. 获取连接前的设备列表
  const devicesBefore = await getDevices(token, endpointUuid);
  log(`✓ 连接前设备数量: ${devicesBefore.length}`, 'blue');

  // 2. 连接 WebSocket 并发送 identify 消息
  const ws = new WebSocket(`${WS_URL}/ws/${TEST_ENDPOINT_ID}`);

  await new Promise((resolve, reject) => {
    let identifiedReceived = false;

    ws.on('open', () => {
      log(`✓ WebSocket 连接成功`, 'green');

      // 发送设备标识消息
      const identifyMessage = {
        type: 'identify',
        deviceId: TEST_DEVICE_ID,
        deviceName: '自动化测试设备',
      };

      ws.send(JSON.stringify(identifyMessage));
      log(`✓ 发送 identify 消息: ${TEST_DEVICE_ID}`, 'blue');
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'identified') {
        log(`✓ 收到 identified 响应: ${message.customName}`, 'green');
        identifiedReceived = true;
        resolve();
      }
    });

    ws.on('error', reject);

    // 超时保护：5秒内没有收到 identified 响应则失败
    setTimeout(() => {
      if (!identifiedReceived) {
        reject(new Error('未收到 identified 响应（超时 5 秒）'));
      }
    }, 5000);
  });

  // 3. 等待 4 秒（大于 3 秒轮询间隔）
  log(`⏳ 等待 4 秒，让前端轮询更新...`, 'yellow');
  await sleep(4000);

  // 4. 查询设备列表，验证新设备已出现
  const devicesAfter = await getDevices(token, endpointUuid);
  const newDevice = devicesAfter.find(d => d.device_id === TEST_DEVICE_ID);

  if (newDevice) {
    log(`✅ 测试通过: 新设备已在列表中显示`, 'green');
    log(`   - 设备名称: ${newDevice.custom_name}`, 'green');
    log(`   - 在线状态: ${newDevice.is_online ? '在线' : '离线'}`, 'green');
  } else {
    log(`❌ 测试失败: 新设备未在列表中显示`, 'red');
    return { success: false, ws };
  }

  return { success: true, ws };
}

/**
 * 测试场景 2: 发送消息后自动更新
 */
async function testMessageUpdate(token, endpointUuid, ws) {
  log('\n📋 测试场景 2: 发送消息后自动更新', 'cyan');
  log('─'.repeat(60), 'cyan');

  // 1. 获取消息前的历史记录数量
  const messagesBefore = await getMessages(token, endpointUuid);
  log(`✓ 发送前消息数量: ${messagesBefore.length}`, 'blue');

  // 2. 发送测试消息
  const testMessage = {
    type: 'test',
    data: `测试消息 - ${new Date().toISOString()}`,
    timestamp: Date.now(),
  };

  ws.send(JSON.stringify(testMessage));
  log(`✓ 发送测试消息`, 'blue');

  // 3. 等待 6 秒（大于 5 秒轮询间隔）
  log(`⏳ 等待 6 秒，让前端轮询更新...`, 'yellow');
  await sleep(6000);

  // 4. 查询历史消息，验证新消息已出现
  const messagesAfter = await getMessages(token, endpointUuid);

  if (messagesAfter.length > messagesBefore.length) {
    const newMessage = messagesAfter[0]; // 最新消息在第一个
    log(`✅ 测试通过: 新消息已在历史记录中显示`, 'green');
    log(`   - 消息数量: ${messagesBefore.length} -> ${messagesAfter.length}`, 'green');
    log(`   - 最新消息: ${newMessage.content.substring(0, 50)}...`, 'green');
    return true;
  } else {
    log(`❌ 测试失败: 新消息未在历史记录中显示`, 'red');
    return false;
  }
}

/**
 * 测试场景 3: 设备断开后自动更新（简化测试）
 */
async function testDeviceDisconnection(token, endpointUuid, ws) {
  log('\n📋 测试场景 3: 设备断开后自动更新', 'cyan');
  log('─'.repeat(60), 'cyan');

  // 1. 关闭 WebSocket 连接
  ws.close();
  log(`✓ WebSocket 连接已关闭`, 'blue');

  // 2. 等待 35 秒（30秒在线判定 + 5秒轮询延迟）
  log(`⏳ 等待 35 秒，让前端更新设备离线状态...`, 'yellow');
  await sleep(35000);

  // 3. 查询设备列表，验证设备状态为离线
  const devices = await getDevices(token, endpointUuid);
  const device = devices.find(d => d.device_id === TEST_DEVICE_ID);

  if (device && !device.is_online) {
    log(`✅ 测试通过: 设备状态已更新为离线`, 'green');
    return true;
  } else if (device && device.is_online) {
    log(`❌ 测试失败: 设备状态仍为在线`, 'red');
    return false;
  } else {
    log(`❌ 测试失败: 设备未找到`, 'red');
    return false;
  }
}

/**
 * 主测试流程
 */
async function main() {
  log('\n🚀 开始无感刷新功能自动化测试', 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    // 1. 获取认证 token
    log('\n🔐 步骤 1: 获取认证 token', 'yellow');
    const token = await getAuthToken();
    log(`✓ Token 获取成功`, 'green');

    // 2. 获取端点 UUID
    log('\n🔍 步骤 2: 获取端点 UUID', 'yellow');
    const endpointUuid = await getEndpointUuid(token, TEST_ENDPOINT_ID);
    log(`✓ 端点 UUID: ${endpointUuid}`, 'green');

    // 3. 执行测试场景 1
    const { success: test1Success, ws } = await testDeviceConnection(token, endpointUuid);
    if (!test1Success) {
      throw new Error('测试场景 1 失败');
    }

    // 4. 执行测试场景 2
    const test2Success = await testMessageUpdate(token, endpointUuid, ws);
    if (!test2Success) {
      throw new Error('测试场景 2 失败');
    }

    // 5. 执行测试场景 3（可选，时间较长）
    log('\n⚠️  测试场景 3 需要等待 35 秒，是否继续？(按 Ctrl+C 跳过)', 'yellow');
    await sleep(3000); // 给用户 3 秒时间决定

    const test3Success = await testDeviceDisconnection(token, endpointUuid, ws);

    // 6. 输出测试结果
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 测试结果汇总', 'cyan');
    log('='.repeat(60), 'cyan');
    log(`✅ 测试场景 1: 设备连接自动更新 - 通过`, 'green');
    log(`✅ 测试场景 2: 消息发送自动更新 - ${test2Success ? '通过' : '失败'}`, test2Success ? 'green' : 'red');
    log(`✅ 测试场景 3: 设备断开自动更新 - ${test3Success ? '通过' : '失败'}`, test3Success ? 'green' : 'red');

    log('\n🎉 所有测试完成！', 'cyan');

  } catch (error) {
    log(`\n❌ 测试失败: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// 运行测试
main().catch(console.error);

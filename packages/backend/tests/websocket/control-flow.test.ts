/**
 * control-flow WebSocket集成测试
 * 测试完整的控制指令发送和ACK接收流程（Epic 6 Story 6.4）
 */

import { WebSocket, WebSocketServer } from 'ws';
import { createServer, Server as HTTPServer } from 'http';
import prisma from '@/config/database';
import { connectionManager } from '@/websocket/connection-manager';
import { sendToDevice } from '@/websocket/message-router';

describe('control-flow - WebSocket控制流程集成测试', () => {
  const TEST_USER_ID = 'test-user-control-flow';
  const TEST_ENDPOINT_ID = 'test-endpoint-control-flow';
  const TEST_DEVICE_ID = 'test-device-control-flow';
  const TEST_DEVICE_IDENTIFIER = 'device-micu-test';
  const TEST_ENDPOINT_IDENTIFIER = 'ep-control-test';

  let wss: WebSocketServer;
  let httpServer: HTTPServer;
  let testPort: number;
  let deviceSocket: WebSocket;

  beforeAll(async () => {
    // 创建测试用户
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        username: 'testuser-control-flow',
        email: 'testcontrolflow@test.com',
        password_hash: 'dummy-hash',
        is_admin: false,
      },
    });

    // 创建测试端点
    await prisma.endpoint.deleteMany({ where: { id: TEST_ENDPOINT_ID } });
    await prisma.endpoint.create({
      data: {
        id: TEST_ENDPOINT_ID,
        endpoint_id: TEST_ENDPOINT_IDENTIFIER,
        name: 'Test Endpoint for Control Flow',
        user_id: TEST_USER_ID,
      },
    });

    // 创建测试设备
    await prisma.device.deleteMany({ where: { id: TEST_DEVICE_ID } });
    await prisma.device.create({
      data: {
        id: TEST_DEVICE_ID,
        endpoint_id: TEST_ENDPOINT_ID,
        device_id: TEST_DEVICE_IDENTIFIER,
        custom_name: 'Test Device MICU',
      },
    });

    // 启动WebSocket测试服务器
    httpServer = createServer();
    wss = new WebSocketServer({ server: httpServer });
    testPort = 8765; // 使用固定测试端口

    await new Promise<void>((resolve) => {
      httpServer.listen(testPort, () => {
        console.log(`WebSocket测试服务器启动在端口 ${testPort}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    // 关闭WebSocket服务器
    if (deviceSocket && deviceSocket.readyState === WebSocket.OPEN) {
      deviceSocket.close();
    }

    await new Promise<void>((resolve) => {
      wss.close(() => {
        httpServer.close(() => {
          resolve();
        });
      });
    });

    // 清理测试数据
    await prisma.controlCommand.deleteMany({
      where: { endpoint_id: TEST_ENDPOINT_ID },
    });
    await prisma.device.deleteMany({ where: { id: TEST_DEVICE_ID } });
    await prisma.endpoint.deleteMany({ where: { id: TEST_ENDPOINT_ID } });
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // 清理控制指令记录
    await prisma.controlCommand.deleteMany({
      where: { endpoint_id: TEST_ENDPOINT_ID },
    });

    // 清空连接管理器
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (connectionManager as any).connections = new Map();
  });

  afterEach(() => {
    if (deviceSocket && deviceSocket.readyState === WebSocket.OPEN) {
      deviceSocket.close();
    }
  });

  describe('完整控制流程测试', () => {
    it('应该完成完整的控制指令发送和ACK接收流程', (done) => {
      const controlMessage = {
        type: 'control',
        commandId: 'cmd-test-001',
        deviceId: TEST_DEVICE_IDENTIFIER,
        command: 'setLight',
        params: { state: 'on' },
        timestamp: Date.now(),
      };

      // 1. 创建设备WebSocket连接
      deviceSocket = new WebSocket(`ws://localhost:${testPort}`);

      deviceSocket.on('open', () => {
        console.log('✅ 设备WebSocket连接成功');

        // 2. 模拟设备标识（手动添加到连接管理器）
        const connections = new Set<WebSocket>();
        (deviceSocket as WebSocket & { deviceId?: string }).deviceId = TEST_DEVICE_IDENTIFIER;
        connections.add(deviceSocket);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        (connectionManager as any).connections.set(TEST_ENDPOINT_IDENTIFIER, connections);

        // 3. 发送控制指令
        try {
          sendToDevice(TEST_ENDPOINT_IDENTIFIER, TEST_DEVICE_IDENTIFIER, controlMessage);
          console.log('✅ 控制指令发送成功');
        } catch (error) {
          done(error);
        }
      });

      deviceSocket.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString()) as {
          type: string;
          commandId: string;
          command?: string;
          params?: Record<string, unknown>;
        };
        console.log('📥 设备收到消息:', message);

        // 4. 验证设备收到的控制消息
        expect(message.type).toBe('control');
        expect(message.commandId).toBe('cmd-test-001');
        expect(message.command).toBe('setLight');
        expect(message.params).toEqual({ state: 'on' });

        // 5. 设备发送ACK响应
        const ackMessage = {
          type: 'control_ack',
          commandId: message.commandId,
          status: 'success',
          message: '灯光已开启',
        };

        deviceSocket.send(JSON.stringify(ackMessage));
        console.log('✅ 设备发送ACK响应');

        // 测试完成
        done();
      });

      deviceSocket.on('error', (error: Error) => {
        done(error);
      });
    }, 10000); // 超时时间10秒

    it('应该正确处理设备离线情况', () => {
      // 1. 准备：端点存在但设备未连接
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (connectionManager as any).connections.set(TEST_ENDPOINT_IDENTIFIER, new Set());

      // 2. 执行：尝试发送控制指令
      const controlMessage = {
        type: 'control',
        commandId: 'cmd-offline-test',
        deviceId: TEST_DEVICE_IDENTIFIER,
        command: 'setLight',
        params: { state: 'on' },
      };

      // 3. 验证：应该抛出DEVICE_OFFLINE错误
      expect(() => {
        sendToDevice(TEST_ENDPOINT_IDENTIFIER, TEST_DEVICE_IDENTIFIER, controlMessage);
      }).toThrow('DEVICE_OFFLINE');
    });
  });

  describe('点对点消息路由验证', () => {
    it('应该只向目标设备发送控制消息，不广播到其他设备', (done) => {
      const device1Identifier = 'device-micu-1';
      const device2Identifier = 'device-micu-2';

      let device1ReceivedCount = 0;
      let device2ReceivedCount = 0;

      // 1. 创建两个设备连接
      const device1Socket = new WebSocket(`ws://localhost:${testPort}`);
      const device2Socket = new WebSocket(`ws://localhost:${testPort}`);

      const handleConnectionReady = () => {
        // 等待两个连接都准备好
        if (
          device1Socket.readyState === WebSocket.OPEN &&
          device2Socket.readyState === WebSocket.OPEN
        ) {
          console.log('✅ 两个设备WebSocket连接成功');

          // 2. 将两个设备添加到连接管理器
          const connections = new Set<WebSocket>();
          (device1Socket as WebSocket & { deviceId?: string }).deviceId = device1Identifier;
          (device2Socket as WebSocket & { deviceId?: string }).deviceId = device2Identifier;
          connections.add(device1Socket);
          connections.add(device2Socket);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          (connectionManager as any).connections.set(TEST_ENDPOINT_IDENTIFIER, connections);

          // 3. 发送控制指令到设备1
          const controlMessage = {
            type: 'control',
            commandId: 'cmd-p2p-test',
            deviceId: device1Identifier,
            command: 'setLight',
            params: { state: 'on' },
          };

          sendToDevice(TEST_ENDPOINT_IDENTIFIER, device1Identifier, controlMessage);
          console.log('✅ 控制指令发送到设备1');

          // 等待1秒后验证结果
          setTimeout(() => {
            // 4. 验证：只有设备1收到消息
            expect(device1ReceivedCount).toBe(1);
            expect(device2ReceivedCount).toBe(0);

            device1Socket.close();
            device2Socket.close();
            done();
          }, 1000);
        }
      };

      device1Socket.on('open', handleConnectionReady);
      device2Socket.on('open', handleConnectionReady);

      device1Socket.on('message', () => {
        device1ReceivedCount++;
        console.log('📥 设备1收到消息');
      });

      device2Socket.on('message', () => {
        device2ReceivedCount++;
        console.log('📥 设备2收到消息（不应该发生）');
      });

      device1Socket.on('error', (error: Error) => {
        device1Socket.close();
        device2Socket.close();
        done(error);
      });

      device2Socket.on('error', (error: Error) => {
        device1Socket.close();
        device2Socket.close();
        done(error);
      });
    }, 10000); // 超时时间10秒
  });

  describe('ACK消息匹配测试', () => {
    it('应该根据commandId正确匹配控制指令和ACK消息', (done) => {
      const command1Id = 'cmd-match-001';
      const command2Id = 'cmd-match-002';

      deviceSocket = new WebSocket(`ws://localhost:${testPort}`);
      const receivedMessages: Array<{ commandId: string; command: string }> = [];

      deviceSocket.on('open', () => {
        // 添加设备到连接管理器
        const connections = new Set<WebSocket>();
        (deviceSocket as WebSocket & { deviceId?: string }).deviceId = TEST_DEVICE_IDENTIFIER;
        connections.add(deviceSocket);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        (connectionManager as any).connections.set(TEST_ENDPOINT_IDENTIFIER, connections);

        // 发送两个不同的控制指令
        sendToDevice(TEST_ENDPOINT_IDENTIFIER, TEST_DEVICE_IDENTIFIER, {
          type: 'control',
          commandId: command1Id,
          command: 'setLight',
          params: { state: 'on' },
        });

        sendToDevice(TEST_ENDPOINT_IDENTIFIER, TEST_DEVICE_IDENTIFIER, {
          type: 'control',
          commandId: command2Id,
          command: 'setTemperature',
          params: { temperature: 25 },
        });
      });

      deviceSocket.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString()) as {
          type: string;
          commandId: string;
          command: string;
        };
        receivedMessages.push({ commandId: message.commandId, command: message.command });

        // 验证收到两个不同的指令
        if (receivedMessages.length === 2) {
          expect(receivedMessages).toContainEqual({ commandId: command1Id, command: 'setLight' });
          expect(receivedMessages).toContainEqual({
            commandId: command2Id,
            command: 'setTemperature',
          });
          done();
        }
      });

      deviceSocket.on('error', (error: Error) => {
        done(error);
      });
    }, 10000); // 超时时间10秒
  });
});

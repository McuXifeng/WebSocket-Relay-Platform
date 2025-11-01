/**
 * message-router 单元测试
 * 测试WebSocket点对点消息路由功能（Epic 6 Story 6.4）
 */

import { WebSocket } from 'ws';
import { connectionManager } from '@/websocket/connection-manager';
import { sendToDevice } from '@/websocket/message-router';

/**
 * 扩展 WebSocket 接口以包含设备标识
 */
interface ExtendedWebSocket extends WebSocket {
  deviceId?: string;
  dbDeviceId?: string;
  customName?: string;
  sentMessages?: string[]; // 测试用：记录发送的消息
}

describe('message-router - sendToDevice', () => {
  const TEST_ENDPOINT_ID = 'ep-test-control';
  const TEST_DEVICE_ID_1 = 'device-micu';
  const TEST_DEVICE_ID_2 = 'device-esp32';

  // Mock WebSocket 对象
  let mockSocket1: ExtendedWebSocket;
  let mockSocket2: ExtendedWebSocket;

  beforeEach(() => {
    // 创建 Mock WebSocket 连接，使用简单的函数记录
    mockSocket1 = {
      deviceId: TEST_DEVICE_ID_1,
      dbDeviceId: 'uuid-micu-001',
      customName: 'MICU设备',
      sentMessages: [],
      send: function (this: ExtendedWebSocket, data: string) {
        this.sentMessages!.push(data);
      },
      close: function () {},
      on: function () {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    } as any as ExtendedWebSocket;

    mockSocket2 = {
      deviceId: TEST_DEVICE_ID_2,
      dbDeviceId: 'uuid-esp32-001',
      customName: 'ESP32设备',
      sentMessages: [],
      send: function (this: ExtendedWebSocket, data: string) {
        this.sentMessages!.push(data);
      },
      close: function () {},
      on: function () {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    } as any as ExtendedWebSocket;

    // 清空连接管理器（通过私有 API 清空，仅用于测试）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    (connectionManager as any).connections = new Map();
  });

  afterEach(() => {
    // 清空消息记录
    if (mockSocket1.sentMessages) mockSocket1.sentMessages = [];
    if (mockSocket2.sentMessages) mockSocket2.sentMessages = [];
  });

  describe('成功发送点对点消息', () => {
    it('应该正确发送JSON对象消息到指定设备', () => {
      // 1. 准备：添加设备连接
      const connections = new Set<WebSocket>();
      connections.add(mockSocket1);
      connections.add(mockSocket2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      (connectionManager as any).connections.set(TEST_ENDPOINT_ID, connections);

      // 2. 执行：发送控制消息到设备1
      const controlMessage = {
        type: 'control',
        commandId: 'cmd-123',
        deviceId: TEST_DEVICE_ID_1,
        command: 'setLight',
        params: { state: 'on' },
      };

      sendToDevice(TEST_ENDPOINT_ID, TEST_DEVICE_ID_1, controlMessage);

      // 3. 验证：设备1收到消息，设备2未收到
      expect(mockSocket1.sentMessages).toHaveLength(1);
      expect(mockSocket1.sentMessages![0]).toBe(JSON.stringify(controlMessage));
      expect(mockSocket2.sentMessages).toHaveLength(0);
    });

    it('应该正确发送字符串消息到指定设备', () => {
      // 1. 准备：添加设备连接
      const connections = new Set<WebSocket>();
      connections.add(mockSocket1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      (connectionManager as any).connections.set(TEST_ENDPOINT_ID, connections);

      // 2. 执行：发送字符串消息
      const stringMessage = 'TURN_ON_LED';

      sendToDevice(TEST_ENDPOINT_ID, TEST_DEVICE_ID_1, stringMessage);

      // 3. 验证：设备1收到原始字符串（不转换为JSON）
      expect(mockSocket1.sentMessages).toHaveLength(1);
      expect(mockSocket1.sentMessages![0]).toBe(stringMessage);
    });

    it('应该能够发送消息到不同的设备', () => {
      // 1. 准备：添加多个设备连接
      const connections = new Set<WebSocket>();
      connections.add(mockSocket1);
      connections.add(mockSocket2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      (connectionManager as any).connections.set(TEST_ENDPOINT_ID, connections);

      // 2. 执行：先发送到设备1，再发送到设备2
      const message1 = { type: 'control', command: 'restart' };
      const message2 = { type: 'control', command: 'reset' };

      sendToDevice(TEST_ENDPOINT_ID, TEST_DEVICE_ID_1, message1);
      sendToDevice(TEST_ENDPOINT_ID, TEST_DEVICE_ID_2, message2);

      // 3. 验证：每个设备只收到自己的消息
      expect(mockSocket1.sentMessages).toHaveLength(1);
      expect(mockSocket1.sentMessages![0]).toBe(JSON.stringify(message1));

      expect(mockSocket2.sentMessages).toHaveLength(1);
      expect(mockSocket2.sentMessages![0]).toBe(JSON.stringify(message2));
    });
  });

  describe('错误处理', () => {
    it('应该抛出DEVICE_OFFLINE错误，当设备不存在时', () => {
      // 1. 准备：端点存在但没有设备连接
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      (connectionManager as any).connections.set(TEST_ENDPOINT_ID, new Set());

      // 2. 执行和验证：调用应该抛出错误
      expect(() => {
        sendToDevice(TEST_ENDPOINT_ID, 'non-existent-device', { test: 'data' });
      }).toThrow('DEVICE_OFFLINE');
    });

    it('应该抛出DEVICE_OFFLINE错误，当端点不存在时', () => {
      // 1. 准备：端点不存在（连接管理器为空）

      // 2. 执行和验证：调用应该抛出错误
      expect(() => {
        sendToDevice('non-existent-endpoint', TEST_DEVICE_ID_1, { test: 'data' });
      }).toThrow('DEVICE_OFFLINE');
    });

    it('应该抛出DEVICE_OFFLINE错误，当设备已断开连接时', () => {
      // 1. 准备：端点有其他设备，但目标设备不在线
      const connections = new Set<WebSocket>();
      connections.add(mockSocket2); // 只有设备2在线
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      (connectionManager as any).connections.set(TEST_ENDPOINT_ID, connections);

      // 2. 执行和验证：发送到设备1应该失败
      expect(() => {
        sendToDevice(TEST_ENDPOINT_ID, TEST_DEVICE_ID_1, { test: 'data' });
      }).toThrow('DEVICE_OFFLINE');
    });

    it('应该抛出错误，当WebSocket发送失败时', () => {
      // 1. 准备：Mock socket.send 抛出错误
      const mockError = new Error('Network error');
      mockSocket1.send = function () {
        throw mockError;
      };

      const connections = new Set<WebSocket>();
      connections.add(mockSocket1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      (connectionManager as any).connections.set(TEST_ENDPOINT_ID, connections);

      // 2. 执行和验证：调用应该抛出原始错误
      expect(() => {
        sendToDevice(TEST_ENDPOINT_ID, TEST_DEVICE_ID_1, { test: 'data' });
      }).toThrow(mockError);
    });
  });

  describe('消息格式验证', () => {
    it('应该正确序列化复杂对象', () => {
      // 1. 准备：添加设备连接
      const connections = new Set<WebSocket>();
      connections.add(mockSocket1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      (connectionManager as any).connections.set(TEST_ENDPOINT_ID, connections);

      // 2. 执行：发送复杂对象
      const complexMessage = {
        type: 'control',
        commandId: 'cmd-789',
        params: {
          nested: { value: 123 },
          array: [1, 2, 3],
          boolean: true,
          null: null,
        },
      };

      sendToDevice(TEST_ENDPOINT_ID, TEST_DEVICE_ID_1, complexMessage);

      // 3. 验证：消息被正确序列化
      expect(mockSocket1.sentMessages).toHaveLength(1);
      expect(mockSocket1.sentMessages![0]).toBe(JSON.stringify(complexMessage));
    });

    it('应该保留字符串消息的原始格式（不额外序列化）', () => {
      // 1. 准备：添加设备连接
      const connections = new Set<WebSocket>();
      connections.add(mockSocket1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      (connectionManager as any).connections.set(TEST_ENDPOINT_ID, connections);

      // 2. 执行：发送已经序列化的JSON字符串
      const jsonString = '{"type":"control","command":"test"}';

      sendToDevice(TEST_ENDPOINT_ID, TEST_DEVICE_ID_1, jsonString);

      // 3. 验证：字符串不被重复序列化
      expect(mockSocket1.sentMessages).toHaveLength(1);
      expect(mockSocket1.sentMessages![0]).toBe(jsonString);
      expect(mockSocket1.sentMessages![0]).not.toBe(JSON.stringify(jsonString));
    });
  });

  describe('点对点路由验证（不广播）', () => {
    it('应该只发送到目标设备，不广播到其他设备', () => {
      // 1. 准备：添加多个设备连接（模拟同一端点的多个设备）
      const mockSocket3 = {
        deviceId: 'device-arduino',
        sentMessages: [],
        send: function (this: ExtendedWebSocket, data: string) {
          this.sentMessages!.push(data);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      } as any as ExtendedWebSocket;

      const connections = new Set<WebSocket>();
      connections.add(mockSocket1);
      connections.add(mockSocket2);
      connections.add(mockSocket3);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      (connectionManager as any).connections.set(TEST_ENDPOINT_ID, connections);

      // 2. 执行：发送控制消息到设备1
      const controlMessage = { type: 'control', command: 'setLight', params: { state: 'on' } };

      sendToDevice(TEST_ENDPOINT_ID, TEST_DEVICE_ID_1, controlMessage);

      // 3. 验证：只有设备1收到消息，其他设备未收到
      expect(mockSocket1.sentMessages).toHaveLength(1);
      expect(mockSocket2.sentMessages).toHaveLength(0);
      expect(mockSocket3.sentMessages).toHaveLength(0);
    });
  });
});

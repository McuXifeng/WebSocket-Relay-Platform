/**
 * control-command.service 单元测试
 * 测试控制指令的状态更新和历史查询功能（Epic 6 Story 6.4）
 * 注意：由于测试环境限制，本测试聚焦于数据库操作和业务逻辑，跳过WebSocket发送测试
 */

import {
  updateCommandStatus,
  getCommandHistory,
  getCommandById,
} from '@/services/control-command.service';
import prisma from '@/config/database';

describe('control-command.service', () => {
  const TEST_USER_ID = 'test-user-control-command';
  const TEST_ENDPOINT_ID = 'test-endpoint-control-command';
  const TEST_DEVICE_ID = 'test-device-control-command';
  const TEST_ENDPOINT_IDENTIFIER = 'ep-ctrl-01'; // 缩短长度以符合数据库限制
  const TEST_DEVICE_IDENTIFIER = 'dev-micu-01'; // 缩短长度

  beforeAll(async () => {
    // 创建测试用户
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        username: 'testuser-control-command',
        email: 'testcontrolcommand@test.com',
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
        name: 'Test Endpoint for Control Command',
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
  });

  beforeEach(async () => {
    // 清理控制指令记录
    await prisma.controlCommand.deleteMany({
      where: { endpoint_id: TEST_ENDPOINT_ID },
    });
  });

  afterAll(async () => {
    // 清理所有测试数据
    await prisma.controlCommand.deleteMany({
      where: { endpoint_id: TEST_ENDPOINT_ID },
    });
    await prisma.device.deleteMany({ where: { id: TEST_DEVICE_ID } });
    await prisma.endpoint.deleteMany({ where: { id: TEST_ENDPOINT_ID } });
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.$disconnect();
  });

  // 辅助函数：创建测试用的控制指令记录
  async function createTestCommand(
    commandId: string,
    commandType: string = 'setLight',
    status: string = 'pending'
  ) {
    return await prisma.controlCommand.create({
      data: {
        endpoint_id: TEST_ENDPOINT_ID,
        device_id: TEST_DEVICE_ID,
        command_id: commandId,
        command_type: commandType,
        command_params: JSON.stringify({ state: 'on' }),
        status,
        timeout_at: new Date(Date.now() + 5000), // 5秒后超时
      },
    });
  }

  describe('updateCommandStatus', () => {
    it('应该正确更新指令状态为success并记录ack_at时间', async () => {
      // 1. 准备：创建一个pending状态的指令
      const commandId = 'test-cmd-success-001';
      await createTestCommand(commandId);

      // 2. 执行：更新状态为success
      await updateCommandStatus(commandId, 'success', '灯光已开启');

      // 3. 验证：状态已更新
      const command = await prisma.controlCommand.findUnique({
        where: { command_id: commandId },
      });

      expect(command!.status).toBe('success');
      expect(command!.ack_at).toBeDefined();
      expect(command!.error_message).toBe('灯光已开启');
    });

    it('应该正确更新指令状态为failed并记录错误消息', async () => {
      // 1. 准备：创建一个pending状态的指令
      const commandId = 'test-cmd-failed-001';
      await createTestCommand(commandId);

      // 2. 执行：更新状态为failed
      await updateCommandStatus(commandId, 'failed', '设备响应错误');

      // 3. 验证：状态已更新
      const command = await prisma.controlCommand.findUnique({
        where: { command_id: commandId },
      });

      expect(command!.status).toBe('failed');
      expect(command!.ack_at).toBeDefined();
      expect(command!.error_message).toBe('设备响应错误');
    });

    it('应该正确更新指令状态为timeout', async () => {
      // 1. 准备：创建一个pending状态的指令
      const commandId = 'test-cmd-timeout-001';
      await createTestCommand(commandId);

      // 2. 执行：更新状态为timeout
      await updateCommandStatus(commandId, 'timeout', '指令超时，未收到ACK响应');

      // 3. 验证：状态已更新
      const command = await prisma.controlCommand.findUnique({
        where: { command_id: commandId },
      });

      expect(command!.status).toBe('timeout');
      expect(command!.ack_at).toBeDefined();
      expect(command!.error_message).toContain('超时');
    });
  });

  describe('getCommandHistory', () => {
    beforeEach(async () => {
      // 准备测试数据：创建多个控制指令记录
      await createTestCommand('test-cmd-history-001', 'setLight');
      await createTestCommand('test-cmd-history-002', 'setTemperature');
      await createTestCommand('test-cmd-history-003', 'setBrightness');
    });

    it('应该正确查询设备的控制指令历史（默认分页）', async () => {
      const result = await getCommandHistory(TEST_DEVICE_ID);

      expect(result.commands).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
    });

    it('应该支持分页查询（pageSize=2）', async () => {
      const result = await getCommandHistory(TEST_DEVICE_ID, {
        page: 1,
        pageSize: 2,
      });

      expect(result.commands).toHaveLength(2);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.totalPages).toBe(2);
    });

    it('应该支持按状态筛选（status=pending）', async () => {
      const result = await getCommandHistory(TEST_DEVICE_ID, {
        status: 'pending',
      });

      expect(result.commands).toHaveLength(3); // 所有指令都是pending
      result.commands.forEach((cmd) => {
        expect(cmd.status).toBe('pending');
      });
    });

    it('应该按sent_at降序排列（最新的在前）', async () => {
      const result = await getCommandHistory(TEST_DEVICE_ID);

      // 验证时间戳按降序排列
      const timestamps = result.commands.map((cmd) => new Date(cmd.sentAt).getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
      }
    });

    it('应该正确计算响应耗时（duration）', async () => {
      // 1. 创建一个指令并立即更新状态为success
      const commandId = 'test-cmd-duration-001';
      await createTestCommand(commandId, 'setLight');
      await new Promise((resolve) => setTimeout(resolve, 100)); // 延迟100ms
      await updateCommandStatus(commandId, 'success', '灯光已开启');

      // 2. 查询历史并验证duration字段
      const history = await getCommandHistory(TEST_DEVICE_ID, {
        status: 'success',
      });

      expect(history.commands).toHaveLength(1);
      expect(history.commands[0].duration).toBeGreaterThan(50); // 至少50ms
      expect(history.commands[0].duration).toBeLessThan(200); // 少于200ms
    });
  });

  describe('getCommandById', () => {
    it('应该正确查询指令详情', async () => {
      // 1. 准备：创建一个指令
      const commandId = 'test-cmd-getbyid-001';
      await createTestCommand(commandId);

      // 2. 执行：查询指令详情
      const command = await getCommandById(commandId);

      // 3. 验证：返回值正确
      expect(command.commandId).toBe(commandId);
      expect(command.deviceId).toBe(TEST_DEVICE_ID);
      expect(command.deviceName).toBe('Test Device MICU');
      expect(command.endpointId).toBe(TEST_ENDPOINT_ID);
      expect(command.commandType).toBe('setLight');
      expect(command.commandParams).toEqual({ state: 'on' });
      expect(command.status).toBe('pending');
    });

    it('应该在指令不存在时抛出COMMAND_NOT_FOUND错误', async () => {
      await expect(getCommandById('non-existent-command-id')).rejects.toThrow('COMMAND_NOT_FOUND');
    });

    it('应该正确计算响应耗时（duration）', async () => {
      // 1. 创建一个指令并立即更新状态为success
      const commandId = 'test-cmd-duration-getbyid-001';
      await createTestCommand(commandId);
      await new Promise((resolve) => setTimeout(resolve, 100)); // 延迟100ms
      await updateCommandStatus(commandId, 'success', '灯光已开启');

      // 2. 查询指令详情并验证duration字段
      const command = await getCommandById(commandId);

      expect(command.duration).toBeGreaterThan(50); // 至少50ms
      expect(command.duration).toBeLessThan(200); // 少于200ms
    });
  });
});

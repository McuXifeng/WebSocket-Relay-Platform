/**
 * device-group.service 单元测试
 * 测试设备分组的CRUD操作和验证逻辑（Epic 6 Story 6.6）
 */

import {
  createDeviceGroup,
  getDeviceGroups,
  getDeviceGroupById,
  updateDeviceGroup,
  deleteDeviceGroup,
  addDevicesToGroup,
  removeDevicesFromGroup,
} from '@/services/device-group.service';
import prisma from '@/config/database';
import { AppError } from '@/middleware/error-handler.middleware';

describe('device-group.service', () => {
  const TEST_USER_ID = 'test-user-device-group';
  const TEST_ENDPOINT_ID = 'test-endpoint-device-group';
  const TEST_DEVICE_ID_1 = 'test-device-group-1';
  const TEST_DEVICE_ID_2 = 'test-device-group-2';
  const TEST_ENDPOINT_IDENTIFIER = 'ep-group-01';
  const TEST_DEVICE_IDENTIFIER_1 = 'dev-group-01';
  const TEST_DEVICE_IDENTIFIER_2 = 'dev-group-02';

  beforeAll(async () => {
    // 创建测试用户
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        username: 'testuser-device-group',
        email: 'testgroup@test.com',
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
        name: 'Test Endpoint for Device Group',
        user_id: TEST_USER_ID,
      },
    });

    // 创建测试设备
    await prisma.device.deleteMany({ where: { id: { in: [TEST_DEVICE_ID_1, TEST_DEVICE_ID_2] } } });
    await prisma.device.create({
      data: {
        id: TEST_DEVICE_ID_1,
        endpoint_id: TEST_ENDPOINT_ID,
        device_id: TEST_DEVICE_IDENTIFIER_1,
        custom_name: 'Test Device 1',
      },
    });
    await prisma.device.create({
      data: {
        id: TEST_DEVICE_ID_2,
        endpoint_id: TEST_ENDPOINT_ID,
        device_id: TEST_DEVICE_IDENTIFIER_2,
        custom_name: 'Test Device 2',
      },
    });
  });

  beforeEach(async () => {
    // 清理设备分组记录
    await prisma.deviceGroup.deleteMany({
      where: { user_id: TEST_USER_ID },
    });
  });

  afterAll(async () => {
    // 清理所有测试数据
    await prisma.deviceGroup.deleteMany({ where: { user_id: TEST_USER_ID } });
    await prisma.device.deleteMany({ where: { id: { in: [TEST_DEVICE_ID_1, TEST_DEVICE_ID_2] } } });
    await prisma.endpoint.deleteMany({ where: { id: TEST_ENDPOINT_ID } });
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.$disconnect();
  });

  describe('createDeviceGroup', () => {
    it('应该成功创建设备分组', async () => {
      const group = await createDeviceGroup({
        userId: TEST_USER_ID,
        endpointId: TEST_ENDPOINT_ID,
        groupName: '一楼温度传感器',
        description: '一楼所有温度传感器',
        deviceIds: [TEST_DEVICE_ID_1, TEST_DEVICE_ID_2],
      });

      expect(group).toBeDefined();
      expect(group.group_name).toBe('一楼温度传感器');
      expect(group.description).toBe('一楼所有温度传感器');
      expect(group.device_count).toBe(2);
    });

    it('应该成功创建不含设备的空分组', async () => {
      const group = await createDeviceGroup({
        userId: TEST_USER_ID,
        endpointId: TEST_ENDPOINT_ID,
        groupName: '空分组',
      });

      expect(group).toBeDefined();
      expect(group.group_name).toBe('空分组');
      expect(group.device_count).toBe(0);
    });

    it('应该拒绝空的分组名称', async () => {
      await expect(
        createDeviceGroup({
          userId: TEST_USER_ID,
          endpointId: TEST_ENDPOINT_ID,
          groupName: '',
        })
      ).rejects.toThrow('分组名称不能为空');
    });

    it('应该拒绝超长的分组名称', async () => {
      await expect(
        createDeviceGroup({
          userId: TEST_USER_ID,
          endpointId: TEST_ENDPOINT_ID,
          groupName: 'a'.repeat(51),
        })
      ).rejects.toThrow('分组名称长度不能超过50个字符');
    });

    it('应该拒绝超长的分组描述', async () => {
      await expect(
        createDeviceGroup({
          userId: TEST_USER_ID,
          endpointId: TEST_ENDPOINT_ID,
          groupName: '测试分组',
          description: 'a'.repeat(201),
        })
      ).rejects.toThrow('分组描述长度不能超过200个字符');
    });

    it('应该拒绝不存在的端点', async () => {
      await expect(
        createDeviceGroup({
          userId: TEST_USER_ID,
          endpointId: 'non-existent-endpoint',
          groupName: '测试分组',
        })
      ).rejects.toThrow('端点不存在');
    });

    it('应该拒绝不属于该端点的设备', async () => {
      await expect(
        createDeviceGroup({
          userId: TEST_USER_ID,
          endpointId: TEST_ENDPOINT_ID,
          groupName: '测试分组',
          deviceIds: ['non-existent-device'],
        })
      ).rejects.toThrow('部分设备不存在或不属于该端点');
    });

    it('应该拒绝创建超过20个分组', async () => {
      // 创建20个分组
      for (let i = 0; i < 20; i++) {
        await createDeviceGroup({
          userId: TEST_USER_ID,
          endpointId: TEST_ENDPOINT_ID,
          groupName: `测试分组${i}`,
        });
      }

      // 尝试创建第21个分组
      await expect(
        createDeviceGroup({
          userId: TEST_USER_ID,
          endpointId: TEST_ENDPOINT_ID,
          groupName: '第21个分组',
        })
      ).rejects.toThrow('已达到设备分组数量上限');
    });
  });

  describe('getDeviceGroups', () => {
    beforeEach(async () => {
      // 创建测试分组
      await createDeviceGroup({
        userId: TEST_USER_ID,
        endpointId: TEST_ENDPOINT_ID,
        groupName: '一楼传感器',
      });
      await createDeviceGroup({
        userId: TEST_USER_ID,
        endpointId: TEST_ENDPOINT_ID,
        groupName: '二楼传感器',
      });
    });

    it('应该返回用户的所有设备分组', async () => {
      const result = await getDeviceGroups({
        userId: TEST_USER_ID,
      });

      expect(result.groups.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('应该支持按端点筛选', async () => {
      const result = await getDeviceGroups({
        userId: TEST_USER_ID,
        endpointId: TEST_ENDPOINT_ID,
      });

      expect(result.groups.length).toBe(2);
    });

    it('应该支持按名称搜索', async () => {
      const result = await getDeviceGroups({
        userId: TEST_USER_ID,
        search: '一楼',
      });

      expect(result.groups.length).toBe(1);
      expect(result.groups[0].group_name).toBe('一楼传感器');
    });

    it('应该支持分页', async () => {
      const result = await getDeviceGroups({
        userId: TEST_USER_ID,
        page: 1,
        pageSize: 1,
      });

      expect(result.groups.length).toBe(1);
      expect(result.total).toBe(2);
    });
  });

  describe('getDeviceGroupById', () => {
    let testGroupId: string;

    beforeEach(async () => {
      const group = await createDeviceGroup({
        userId: TEST_USER_ID,
        endpointId: TEST_ENDPOINT_ID,
        groupName: '测试分组',
        deviceIds: [TEST_DEVICE_ID_1],
      });
      testGroupId = group.id;
    });

    it('应该返回分组详情', async () => {
      const group = await getDeviceGroupById(testGroupId, TEST_USER_ID);

      expect(group).toBeDefined();
      expect(group.id).toBe(testGroupId);
      expect(group.group_name).toBe('测试分组');
      expect(group.devices.length).toBe(1);
    });

    it('应该拒绝访问不存在的分组', async () => {
      await expect(getDeviceGroupById('non-existent-group', TEST_USER_ID)).rejects.toThrow(
        '设备分组不存在'
      );
    });
  });

  describe('updateDeviceGroup', () => {
    let testGroupId: string;

    beforeEach(async () => {
      const group = await createDeviceGroup({
        userId: TEST_USER_ID,
        endpointId: TEST_ENDPOINT_ID,
        groupName: '原始分组名称',
        description: '原始描述',
      });
      testGroupId = group.id;
    });

    it('应该成功更新分组名称和描述', async () => {
      const updated = await updateDeviceGroup(testGroupId, TEST_USER_ID, {
        groupName: '新分组名称',
        description: '新描述',
      });

      expect(updated.group_name).toBe('新分组名称');
      expect(updated.description).toBe('新描述');
    });

    it('应该拒绝超长的分组名称', async () => {
      await expect(
        updateDeviceGroup(testGroupId, TEST_USER_ID, {
          groupName: 'a'.repeat(51),
        })
      ).rejects.toThrow('分组名称长度不能超过50个字符');
    });
  });

  describe('deleteDeviceGroup', () => {
    let testGroupId: string;

    beforeEach(async () => {
      const group = await createDeviceGroup({
        userId: TEST_USER_ID,
        endpointId: TEST_ENDPOINT_ID,
        groupName: '待删除分组',
      });
      testGroupId = group.id;
    });

    it('应该成功删除分组', async () => {
      await deleteDeviceGroup(testGroupId, TEST_USER_ID);

      // 验证分组已被删除
      await expect(getDeviceGroupById(testGroupId, TEST_USER_ID)).rejects.toThrow(
        '设备分组不存在'
      );
    });
  });

  describe('addDevicesToGroup', () => {
    let testGroupId: string;

    beforeEach(async () => {
      const group = await createDeviceGroup({
        userId: TEST_USER_ID,
        endpointId: TEST_ENDPOINT_ID,
        groupName: '测试分组',
      });
      testGroupId = group.id;
    });

    it('应该成功添加设备到分组', async () => {
      const result = await addDevicesToGroup(testGroupId, TEST_USER_ID, [
        TEST_DEVICE_ID_1,
        TEST_DEVICE_ID_2,
      ]);

      expect(result.added_count).toBe(2);
      expect(result.total_devices).toBe(2);
    });

    it('应该忽略重复添加的设备', async () => {
      // 第一次添加
      await addDevicesToGroup(testGroupId, TEST_USER_ID, [TEST_DEVICE_ID_1]);

      // 第二次添加相同设备
      const result = await addDevicesToGroup(testGroupId, TEST_USER_ID, [TEST_DEVICE_ID_1]);

      expect(result.added_count).toBe(0);
      expect(result.total_devices).toBe(1);
    });
  });

  describe('removeDevicesFromGroup', () => {
    let testGroupId: string;

    beforeEach(async () => {
      const group = await createDeviceGroup({
        userId: TEST_USER_ID,
        endpointId: TEST_ENDPOINT_ID,
        groupName: '测试分组',
        deviceIds: [TEST_DEVICE_ID_1, TEST_DEVICE_ID_2],
      });
      testGroupId = group.id;
    });

    it('应该成功从分组移除设备', async () => {
      const result = await removeDevicesFromGroup(testGroupId, TEST_USER_ID, [TEST_DEVICE_ID_1]);

      expect(result.removed_count).toBe(1);
      expect(result.total_devices).toBe(1);
    });

    it('应该成功移除不存在的设备（不报错）', async () => {
      const result = await removeDevicesFromGroup(testGroupId, TEST_USER_ID, ['non-existent']);

      expect(result.removed_count).toBe(0);
      expect(result.total_devices).toBe(2);
    });
  });
});

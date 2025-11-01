/**
 * Device Group API 集成测试 (Epic 6 Story 6.6)
 * 测试设备分组 API 的完整流程
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import request from 'supertest';
import app from '@/app';
import prisma from '@/config/database';
import jwt from 'jsonwebtoken';
import { config } from '@/config/env';

describe('Device Group API Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let endpointId: string;
  let deviceId1: string;
  let deviceId2: string;

  beforeAll(async () => {
    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        username: 'device_group_testuser',
        email: 'device_group@example.com',
        password_hash: 'hashed-password',
      },
    });
    userId = user.id;

    // 生成 JWT Token
    authToken = jwt.sign(
      { userId: user.id, username: user.username, isAdmin: false },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 创建测试端点
    const endpoint = await prisma.endpoint.create({
      data: {
        user_id: userId,
        endpoint_id: 'TEST-EP-GRP1',
        name: 'Device Group Test Endpoint',
      },
    });
    endpointId = endpoint.id;

    // 创建测试设备
    const device1 = await prisma.device.create({
      data: {
        endpoint_id: endpointId,
        device_id: 'TEST-DEV-G1',
        custom_name: 'Test Device 1',
      },
    });
    deviceId1 = device1.id;

    const device2 = await prisma.device.create({
      data: {
        endpoint_id: endpointId,
        device_id: 'TEST-DEV-G2',
        custom_name: 'Test Device 2',
      },
    });
    deviceId2 = device2.id;
  });

  afterEach(async () => {
    // 清理设备分组数据
    await prisma.deviceGroupMember.deleteMany();
    await prisma.deviceGroup.deleteMany({ where: { user_id: userId } });
  });

  afterAll(async () => {
    // 清理所有测试数据
    await prisma.deviceGroupMember.deleteMany();
    await prisma.deviceGroup.deleteMany({ where: { user_id: userId } });
    await prisma.device.deleteMany({ where: { endpoint_id: endpointId } });
    await prisma.endpoint.deleteMany({ where: { user_id: userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe('POST /api/device-groups - 创建设备分组', () => {
    it('应该成功创建设备分组（不包含设备）', async () => {
      const response = await request(app)
        .post('/api/device-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          endpoint_id: endpointId,
          group_name: '一楼温度传感器',
          description: '一楼所有温度传感器',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.group_name).toBe('一楼温度传感器');
      expect(response.body.data.description).toBe('一楼所有温度传感器');
      expect(response.body.data.endpoint_id).toBe(endpointId);
      expect(response.body.data.user_id).toBe(userId);
      expect(response.body.data.device_count).toBe(0);
    });

    it('应该成功创建设备分组（包含初始设备）', async () => {
      const response = await request(app)
        .post('/api/device-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          endpoint_id: endpointId,
          group_name: '一楼传感器',
          description: '一楼所有传感器',
          device_ids: [deviceId1, deviceId2],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.group_name).toBe('一楼传感器');
      expect(response.body.data.device_count).toBe(2);
    });

    it('应该在缺少必填参数时返回 400 错误', async () => {
      const response = await request(app)
        .post('/api/device-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // 缺少 endpoint_id
          group_name: '测试分组',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('缺少必填参数');
    });

    it('应该在分组名称为空时返回 400 错误', async () => {
      const response = await request(app)
        .post('/api/device-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          endpoint_id: endpointId,
          group_name: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('缺少必填参数');
    });

    it('应该在分组名称超过50字符时返回 400 错误', async () => {
      const response = await request(app)
        .post('/api/device-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          endpoint_id: endpointId,
          group_name: 'a'.repeat(51),
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('分组名称长度不能超过50个字符');
    });

    it('应该在描述超过200字符时返回 400 错误', async () => {
      const response = await request(app)
        .post('/api/device-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          endpoint_id: endpointId,
          group_name: '测试分组',
          description: 'a'.repeat(201),
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('分组描述长度不能超过200个字符');
    });

    it('应该在端点不存在时返回 404 错误', async () => {
      const response = await request(app)
        .post('/api/device-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          endpoint_id: 'nonexistent-endpoint',
          group_name: '测试分组',
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('端点不存在');
    });

    it('应该在设备不属于该端点时返回 404 错误', async () => {
      // 创建另一个端点和设备
      const otherEndpoint = await prisma.endpoint.create({
        data: {
          user_id: userId,
          endpoint_id: 'TEST-EP-OTH',
          name: 'Other Endpoint',
        },
      });

      const otherDevice = await prisma.device.create({
        data: {
          endpoint_id: otherEndpoint.id,
          device_id: 'TEST-DEV-OT',
          custom_name: 'Other Device',
        },
      });

      const response = await request(app)
        .post('/api/device-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          endpoint_id: endpointId,
          group_name: '测试分组',
          device_ids: [otherDevice.id],
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('部分设备不存在或不属于该端点');

      // 清理
      await prisma.device.delete({ where: { id: otherDevice.id } });
      await prisma.endpoint.delete({ where: { id: otherEndpoint.id } });
    });

    it('应该在超过分组数量限制(20个)时返回 400 错误', async () => {
      // 创建 20 个分组
      const groups = Array.from({ length: 20 }, (_, i) => ({
        user_id: userId,
        endpoint_id: endpointId,
        group_name: `分组 ${i + 1}`,
      }));

      await prisma.deviceGroup.createMany({ data: groups });

      // 尝试创建第 21 个分组
      const response = await request(app)
        .post('/api/device-groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          endpoint_id: endpointId,
          group_name: '分组 21',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('已达到设备分组数量上限');
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).post('/api/device-groups').send({
        endpoint_id: endpointId,
        group_name: '测试分组',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/device-groups - 获取设备分组列表', () => {
    beforeEach(async () => {
      // 创建测试分组
      await prisma.deviceGroup.createMany({
        data: [
          {
            user_id: userId,
            endpoint_id: endpointId,
            group_name: '一楼传感器',
            description: '一楼所有传感器',
          },
          {
            user_id: userId,
            endpoint_id: endpointId,
            group_name: '二楼传感器',
            description: '二楼所有传感器',
          },
        ],
      });
    });

    it('应该成功获取所有设备分组', async () => {
      const response = await request(app)
        .get('/api/device-groups')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('groups');
      expect(Array.isArray(response.body.data.groups)).toBe(true);
      expect(response.body.data.groups.length).toBe(2);
      expect(response.body.data).toHaveProperty('page');
      expect(response.body.data).toHaveProperty('page_size');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data.total).toBe(2);
    });

    it('应该成功按端点筛选设备分组', async () => {
      const response = await request(app)
        .get(`/api/device-groups?endpoint_id=${endpointId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.groups.length).toBe(2);
    });

    it('应该成功按名称搜索设备分组', async () => {
      const response = await request(app)
        .get('/api/device-groups?search=' + encodeURIComponent('一楼'))
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.groups.length).toBe(1);
      expect(response.body.data.groups[0].group_name).toBe('一楼传感器');
    });

    it('应该支持分页', async () => {
      const response = await request(app)
        .get('/api/device-groups?page=1&page_size=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.groups.length).toBe(1);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.page_size).toBe(1);
      expect(response.body.data.total).toBe(2);
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).get('/api/device-groups');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/device-groups/:groupId - 获取分组详情', () => {
    let groupId: string;

    beforeEach(async () => {
      const group = await prisma.deviceGroup.create({
        data: {
          user_id: userId,
          endpoint_id: endpointId,
          group_name: '一楼传感器',
          description: '一楼所有传感器',
          members: {
            create: [{ device_id: deviceId1 }, { device_id: deviceId2 }],
          },
        },
      });
      groupId = group.id;
    });

    it('应该成功获取分组详情', async () => {
      const response = await request(app)
        .get(`/api/device-groups/${groupId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(groupId);
      expect(response.body.data.group_name).toBe('一楼传感器');
      expect(response.body.data.description).toBe('一楼所有传感器');
      expect(response.body.data.endpoint_id).toBe(endpointId);
      expect(response.body.data.device_count).toBe(2);
      expect(Array.isArray(response.body.data.devices)).toBe(true);
      expect(response.body.data.devices.length).toBe(2);
      expect(response.body.data.devices[0]).toHaveProperty('id');
      expect(response.body.data.devices[0]).toHaveProperty('device_id');
      expect(response.body.data.devices[0]).toHaveProperty('custom_name');
    });

    it('应该在分组不存在时返回 404 错误', async () => {
      const response = await request(app)
        .get('/api/device-groups/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('设备分组不存在');
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).get(`/api/device-groups/${groupId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/device-groups/:groupId - 更新设备分组', () => {
    let groupId: string;

    beforeEach(async () => {
      const group = await prisma.deviceGroup.create({
        data: {
          user_id: userId,
          endpoint_id: endpointId,
          group_name: '一楼传感器',
          description: '一楼所有传感器',
        },
      });
      groupId = group.id;
    });

    it('应该成功更新分组信息', async () => {
      const response = await request(app)
        .put(`/api/device-groups/${groupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          group_name: '一楼温湿度传感器',
          description: '一楼所有温湿度传感器',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.group_name).toBe('一楼温湿度传感器');
      expect(response.body.data.description).toBe('一楼所有温湿度传感器');
    });

    it('应该支持只更新分组名称', async () => {
      const response = await request(app)
        .put(`/api/device-groups/${groupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          group_name: '新名称',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.group_name).toBe('新名称');
    });

    it('应该在分组名称为空时返回 400 错误', async () => {
      const response = await request(app)
        .put(`/api/device-groups/${groupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          group_name: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('分组名称不能为空');
    });

    it('应该在分组不存在时返回 404 错误', async () => {
      const response = await request(app)
        .put('/api/device-groups/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          group_name: '新名称',
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('设备分组不存在');
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).put(`/api/device-groups/${groupId}`).send({
        group_name: '新名称',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/device-groups/:groupId - 删除设备分组', () => {
    let groupId: string;

    beforeEach(async () => {
      const group = await prisma.deviceGroup.create({
        data: {
          user_id: userId,
          endpoint_id: endpointId,
          group_name: '一楼传感器',
          members: {
            create: [{ device_id: deviceId1 }],
          },
        },
      });
      groupId = group.id;
    });

    it('应该成功删除设备分组', async () => {
      const response = await request(app)
        .delete(`/api/device-groups/${groupId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.success).toBe(true);
      expect(response.body.data.message).toBe('设备分组已删除');

      // 验证数据库中分组已删除
      const deletedGroup = await prisma.deviceGroup.findUnique({
        where: { id: groupId },
      });
      expect(deletedGroup).toBeNull();
    });

    it('应该级联删除分组成员关系', async () => {
      // 获取分组成员
      const membersBefore = await prisma.deviceGroupMember.findMany({
        where: { group_id: groupId },
      });
      expect(membersBefore.length).toBe(1);

      // 删除分组
      await request(app)
        .delete(`/api/device-groups/${groupId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // 验证分组成员已删除
      const membersAfter = await prisma.deviceGroupMember.findMany({
        where: { group_id: groupId },
      });
      expect(membersAfter.length).toBe(0);

      // 验证设备本身未被删除
      const device = await prisma.device.findUnique({
        where: { id: deviceId1 },
      });
      expect(device).not.toBeNull();
    });

    it('应该在分组不存在时返回 404 错误', async () => {
      const response = await request(app)
        .delete('/api/device-groups/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('设备分组不存在');
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).delete(`/api/device-groups/${groupId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/device-groups/:groupId/devices - 添加设备到分组', () => {
    let groupId: string;

    beforeEach(async () => {
      const group = await prisma.deviceGroup.create({
        data: {
          user_id: userId,
          endpoint_id: endpointId,
          group_name: '一楼传感器',
        },
      });
      groupId = group.id;
    });

    it('应该成功添加设备到分组', async () => {
      const response = await request(app)
        .post(`/api/device-groups/${groupId}/devices`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          device_ids: [deviceId1, deviceId2],
        });

      expect(response.status).toBe(200);
      expect(response.body.data.added_count).toBe(2);
      expect(response.body.data.total_devices).toBe(2);
    });

    it('应该跳过已存在的设备', async () => {
      // 先添加一个设备
      await prisma.deviceGroupMember.create({
        data: {
          group_id: groupId,
          device_id: deviceId1,
        },
      });

      const response = await request(app)
        .post(`/api/device-groups/${groupId}/devices`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          device_ids: [deviceId1, deviceId2],
        });

      expect(response.status).toBe(200);
      expect(response.body.data.added_count).toBe(1); // 只添加了 deviceId2
      expect(response.body.data.total_devices).toBe(2);
    });

    it('应该在缺少设备ID列表时返回 400 错误', async () => {
      const response = await request(app)
        .post(`/api/device-groups/${groupId}/devices`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('缺少设备ID列表');
    });

    it('应该在设备不属于该端点时返回 404 错误', async () => {
      // 创建另一个端点和设备
      const otherEndpoint = await prisma.endpoint.create({
        data: {
          user_id: userId,
          endpoint_id: 'TEST-EP-OT2',
          name: 'Other Endpoint 2',
        },
      });

      const otherDevice = await prisma.device.create({
        data: {
          endpoint_id: otherEndpoint.id,
          device_id: 'TEST-DEV-OT2',
          custom_name: 'Other Device 2',
        },
      });

      const response = await request(app)
        .post(`/api/device-groups/${groupId}/devices`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          device_ids: [otherDevice.id],
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('部分设备不存在或不属于该端点');

      // 清理
      await prisma.device.delete({ where: { id: otherDevice.id } });
      await prisma.endpoint.delete({ where: { id: otherEndpoint.id } });
    });

    it('应该在分组不存在时返回 404 错误', async () => {
      const response = await request(app)
        .post('/api/device-groups/nonexistent-id/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          device_ids: [deviceId1],
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('设备分组不存在');
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app)
        .post(`/api/device-groups/${groupId}/devices`)
        .send({
          device_ids: [deviceId1],
        });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/device-groups/:groupId/devices - 从分组移除设备', () => {
    let groupId: string;

    beforeEach(async () => {
      const group = await prisma.deviceGroup.create({
        data: {
          user_id: userId,
          endpoint_id: endpointId,
          group_name: '一楼传感器',
          members: {
            create: [{ device_id: deviceId1 }, { device_id: deviceId2 }],
          },
        },
      });
      groupId = group.id;
    });

    it('应该成功从分组移除设备', async () => {
      const response = await request(app)
        .delete(`/api/device-groups/${groupId}/devices`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          device_ids: [deviceId1],
        });

      expect(response.status).toBe(200);
      expect(response.body.data.removed_count).toBe(1);
      expect(response.body.data.total_devices).toBe(1);
    });

    it('应该成功移除多个设备', async () => {
      const response = await request(app)
        .delete(`/api/device-groups/${groupId}/devices`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          device_ids: [deviceId1, deviceId2],
        });

      expect(response.status).toBe(200);
      expect(response.body.data.removed_count).toBe(2);
      expect(response.body.data.total_devices).toBe(0);
    });

    it('应该在设备不在分组中时返回 removed_count=0', async () => {
      // 创建一个新设备（不在分组中）
      const newDevice = await prisma.device.create({
        data: {
          endpoint_id: endpointId,
          device_id: 'TEST-DEV-NEW',
          custom_name: 'New Device',
        },
      });

      const response = await request(app)
        .delete(`/api/device-groups/${groupId}/devices`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          device_ids: [newDevice.id],
        });

      expect(response.status).toBe(200);
      expect(response.body.data.removed_count).toBe(0);
      expect(response.body.data.total_devices).toBe(2); // 原有的两个设备仍在

      // 清理
      await prisma.device.delete({ where: { id: newDevice.id } });
    });

    it('应该在缺少设备ID列表时返回 400 错误', async () => {
      const response = await request(app)
        .delete(`/api/device-groups/${groupId}/devices`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('缺少设备ID列表');
    });

    it('应该在分组不存在时返回 404 错误', async () => {
      const response = await request(app)
        .delete('/api/device-groups/nonexistent-id/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          device_ids: [deviceId1],
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('设备分组不存在');
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app)
        .delete(`/api/device-groups/${groupId}/devices`)
        .send({
          device_ids: [deviceId1],
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/device-groups/:groupId/data - 获取分组数据聚合', () => {
    let groupId: string;

    beforeEach(async () => {
      // 创建测试分组
      const group = await prisma.deviceGroup.create({
        data: {
          user_id: userId,
          endpoint_id: endpointId,
          group_name: '数据聚合测试分组',
        },
      });
      groupId = group.id;

      // 添加设备到分组
      await prisma.deviceGroupMember.createMany({
        data: [
          { group_id: groupId, device_id: deviceId1 },
          { group_id: groupId, device_id: deviceId2 },
        ],
      });

      // 为设备添加测试数据
      await prisma.deviceData.createMany({
        data: [
          {
            device_id: deviceId1,
            data_key: 'temperature',
            data_value: '25.5',
            data_type: 'number',
            unit: '°C',
            timestamp: new Date(),
          },
          {
            device_id: deviceId2,
            data_key: 'temperature',
            data_value: '26.0',
            data_type: 'number',
            unit: '°C',
            timestamp: new Date(),
          },
          {
            device_id: deviceId1,
            data_key: 'humidity',
            data_value: '60',
            data_type: 'number',
            unit: '%',
            timestamp: new Date(),
          },
          {
            device_id: deviceId2,
            data_key: 'humidity',
            data_value: '65',
            data_type: 'number',
            unit: '%',
            timestamp: new Date(),
          },
        ],
      });
    });

    afterEach(async () => {
      // 清理测试数据
      await prisma.deviceData.deleteMany({
        where: { device_id: { in: [deviceId1, deviceId2] } },
      });
    });

    it('应该成功获取分组数据聚合', async () => {
      const response = await request(app)
        .get(`/api/device-groups/${groupId}/data`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('group_id', groupId);
      expect(response.body.data).toHaveProperty('device_count', 2);
      expect(response.body.data).toHaveProperty('aggregations');
      expect(response.body.data.aggregations).toBeInstanceOf(Array);

      // 验证聚合数据
      const tempAgg = response.body.data.aggregations.find(
        (a: any) => a.data_key === 'temperature'
      );
      expect(tempAgg).toBeDefined();
      expect(tempAgg.unit).toBe('°C');
      expect(tempAgg.average).toBeCloseTo(25.75, 1); // (25.5 + 26.0) / 2
      expect(tempAgg.max).toBe(26.0);
      expect(tempAgg.min).toBe(25.5);
      expect(tempAgg.sample_count).toBe(2);
    });

    it('应该返回空聚合结果（分组无设备）', async () => {
      // 创建空分组
      const emptyGroup = await prisma.deviceGroup.create({
        data: {
          user_id: userId,
          endpoint_id: endpointId,
          group_name: '空分组',
        },
      });

      const response = await request(app)
        .get(`/api/device-groups/${emptyGroup.id}/data`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.device_count).toBe(0);
      expect(response.body.data.aggregations).toEqual([]);

      // 清理
      await prisma.deviceGroup.delete({ where: { id: emptyGroup.id } });
    });

    it('应该在分组不存在时返回 404 错误', async () => {
      const response = await request(app)
        .get('/api/device-groups/nonexistent-id/data')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('设备分组不存在');
    });

    it('应该在无权访问时返回 403 错误', async () => {
      // 创建另一个用户
      const otherUser = await prisma.user.create({
        data: {
          username: 'other_user_data_test',
          email: 'other_data@example.com',
          password_hash: 'hashed-password',
        },
      });

      const otherToken = jwt.sign(
        { userId: otherUser.id, username: otherUser.username, isAdmin: false },
        config.jwtSecret,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get(`/api/device-groups/${groupId}/data`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toBe('无权访问该设备分组');

      // 清理
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).get(`/api/device-groups/${groupId}/data`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/device-groups/:groupId/control - 批量发送控制指令', () => {
    let groupId: string;

    beforeEach(async () => {
      // 创建测试分组
      const group = await prisma.deviceGroup.create({
        data: {
          user_id: userId,
          endpoint_id: endpointId,
          group_name: '批量控制测试分组',
        },
      });
      groupId = group.id;

      // 添加设备到分组
      await prisma.deviceGroupMember.createMany({
        data: [
          { group_id: groupId, device_id: deviceId1 },
          { group_id: groupId, device_id: deviceId2 },
        ],
      });
    });

    it('应该成功批量发送控制指令', async () => {
      const response = await request(app)
        .post(`/api/device-groups/${groupId}/control`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          command_type: 'setLight',
          command_params: { brightness: 80 },
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('batchId');
      expect(response.body.data).toHaveProperty('totalDevices', 2);
      expect(response.body.data).toHaveProperty('commands');
      expect(response.body.data.commands).toBeInstanceOf(Array);
      expect(response.body.data.commands.length).toBe(2);

      // 验证每个设备都有指令
      response.body.data.commands.forEach((cmd: any) => {
        expect(cmd).toHaveProperty('deviceId');
        expect(cmd).toHaveProperty('deviceName');
        expect(cmd).toHaveProperty('status');
        // 状态可能是 pending 或 failed（如果WebSocket未连接）
        expect(['pending', 'failed']).toContain(cmd.status);
      });
    });

    it('应该在缺少指令类型时返回 400 错误', async () => {
      const response = await request(app)
        .post(`/api/device-groups/${groupId}/control`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          command_params: { brightness: 80 },
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('缺少指令类型');
    });

    it('应该在分组不存在时返回 404 错误', async () => {
      const response = await request(app)
        .post('/api/device-groups/nonexistent-id/control')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          command_type: 'setLight',
          command_params: {},
        });

      expect(response.status).toBe(404);
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).post(`/api/device-groups/${groupId}/control`).send({
        command_type: 'setLight',
        command_params: {},
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/device-groups/:groupId/control/:batchId - 查询批量指令状态', () => {
    let groupId: string;
    let batchId: string;

    beforeEach(async () => {
      // 创建测试分组
      const group = await prisma.deviceGroup.create({
        data: {
          user_id: userId,
          endpoint_id: endpointId,
          group_name: '批量控制状态查询测试分组',
        },
      });
      groupId = group.id;

      // 添加设备到分组
      await prisma.deviceGroupMember.createMany({
        data: [
          { group_id: groupId, device_id: deviceId1 },
          { group_id: groupId, device_id: deviceId2 },
        ],
      });

      // 发送批量控制指令获取 batchId
      const controlResponse = await request(app)
        .post(`/api/device-groups/${groupId}/control`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          command_type: 'setLight',
          command_params: { brightness: 80 },
        });

      batchId = controlResponse.body.data.batchId;
    });

    it('应该成功查询批量指令状态', async () => {
      const response = await request(app)
        .get(`/api/device-groups/${groupId}/control/${batchId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('batchId', batchId);
      expect(response.body.data).toHaveProperty('totalDevices');
      expect(response.body.data).toHaveProperty('successCount');
      expect(response.body.data).toHaveProperty('failedCount');
      expect(response.body.data).toHaveProperty('pendingCount');
      expect(response.body.data).toHaveProperty('timeoutCount');
      expect(response.body.data).toHaveProperty('commands');
      expect(response.body.data.commands).toBeInstanceOf(Array);
    });

    it('应该在批量指令不存在时返回错误', async () => {
      const response = await request(app)
        .get(`/api/device-groups/${groupId}/control/nonexistent-batch-id`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500); // 服务层抛出错误
    });

    it('应该在分组不存在时返回 404 错误', async () => {
      const response = await request(app)
        .get(`/api/device-groups/nonexistent-id/control/${batchId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).get(`/api/device-groups/${groupId}/control/${batchId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/device-groups/:groupId/export - 导出分组设备数据', () => {
    let groupId: string;

    beforeEach(async () => {
      // 创建测试分组
      const group = await prisma.deviceGroup.create({
        data: {
          user_id: userId,
          endpoint_id: endpointId,
          group_name: '数据导出测试分组',
        },
      });
      groupId = group.id;

      // 添加设备到分组
      await prisma.deviceGroupMember.createMany({
        data: [
          { group_id: groupId, device_id: deviceId1 },
          { group_id: groupId, device_id: deviceId2 },
        ],
      });

      // 创建测试设备数据
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      await prisma.deviceData.createMany({
        data: [
          // Device 1 数据
          {
            device_id: deviceId1,
            data_key: 'temperature',
            data_value: '25.5',
            data_type: 'number',
            unit: '°C',
            timestamp: oneHourAgo,
          },
          {
            device_id: deviceId1,
            data_key: 'humidity',
            data_value: '60',
            data_type: 'number',
            unit: '%',
            timestamp: oneHourAgo,
          },
          // Device 2 数据
          {
            device_id: deviceId2,
            data_key: 'temperature',
            data_value: '26.0',
            data_type: 'number',
            unit: '°C',
            timestamp: oneHourAgo,
          },
          {
            device_id: deviceId2,
            data_key: 'humidity',
            data_value: '62',
            data_type: 'number',
            unit: '%',
            timestamp: oneHourAgo,
          },
        ],
      });
    });

    afterEach(async () => {
      // 清理设备数据
      await prisma.deviceData.deleteMany({
        where: {
          device_id: { in: [deviceId1, deviceId2] },
        },
      });
    });

    it('应该成功导出CSV格式数据', async () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const response = await request(app)
        .get(`/api/device-groups/${groupId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          start_time: twoHoursAgo.toISOString(),
          end_time: now.toISOString(),
          format: 'csv',
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.csv');

      // 验证 CSV 内容包含必要字段
      const csvContent = response.text;
      expect(csvContent).toContain('device_id');
      expect(csvContent).toContain('device_name');
      expect(csvContent).toContain('timestamp');
      expect(csvContent).toContain('temperature');
      expect(csvContent).toContain('humidity');
    });

    it('应该成功导出JSON格式数据', async () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const response = await request(app)
        .get(`/api/device-groups/${groupId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          start_time: twoHoursAgo.toISOString(),
          end_time: now.toISOString(),
          format: 'json',
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.json');

      // 验证 JSON 内容
      const jsonContent = JSON.parse(response.text);
      expect(Array.isArray(jsonContent)).toBe(true);
      expect(jsonContent.length).toBeGreaterThan(0);

      // 验证数据结构
      const firstRecord = jsonContent[0];
      expect(firstRecord).toHaveProperty('device_id');
      expect(firstRecord).toHaveProperty('device_name');
      expect(firstRecord).toHaveProperty('timestamp');
    });

    it('应该支持按data_keys筛选导出数据', async () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const response = await request(app)
        .get(`/api/device-groups/${groupId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          start_time: twoHoursAgo.toISOString(),
          end_time: now.toISOString(),
          data_keys: 'temperature',
          format: 'json',
        });

      expect(response.status).toBe(200);

      // 验证只包含 temperature 字段
      const jsonContent = JSON.parse(response.text);
      expect(jsonContent.length).toBeGreaterThan(0);

      const firstRecord = jsonContent[0];
      expect(firstRecord).toHaveProperty('temperature');
      expect(firstRecord).not.toHaveProperty('humidity');
    });

    it('应该支持limit参数限制导出数据量', async () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const response = await request(app)
        .get(`/api/device-groups/${groupId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          start_time: twoHoursAgo.toISOString(),
          end_time: now.toISOString(),
          limit: '2',
          format: 'json',
        });

      expect(response.status).toBe(200);

      const jsonContent = JSON.parse(response.text);
      expect(jsonContent.length).toBeLessThanOrEqual(2);
    });

    it('应该在缺少时间范围参数时返回 400 错误', async () => {
      const response = await request(app)
        .get(`/api/device-groups/${groupId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          format: 'csv',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('缺少时间范围参数');
    });

    it('应该在导出格式不支持时返回 400 错误', async () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const response = await request(app)
        .get(`/api/device-groups/${groupId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          start_time: twoHoursAgo.toISOString(),
          end_time: now.toISOString(),
          format: 'xml',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('不支持的导出格式');
    });

    it('应该在limit超过10000时返回 400 错误', async () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const response = await request(app)
        .get(`/api/device-groups/${groupId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          start_time: twoHoursAgo.toISOString(),
          end_time: now.toISOString(),
          limit: '20000',
          format: 'csv',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('导出数据量不能超过10000条');
    });

    it('应该在分组不存在时返回 404 错误', async () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const response = await request(app)
        .get('/api/device-groups/nonexistent-id/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          start_time: twoHoursAgo.toISOString(),
          end_time: now.toISOString(),
          format: 'csv',
        });

      expect(response.status).toBe(404);
    });

    it('应该在未认证时返回 401 错误', async () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const response = await request(app).get(`/api/device-groups/${groupId}/export`).query({
        start_time: twoHoursAgo.toISOString(),
        end_time: now.toISOString(),
        format: 'csv',
      });

      expect(response.status).toBe(401);
    });

    it('应该在分组内没有设备时返回 400 错误', async () => {
      // 创建空分组
      const emptyGroup = await prisma.deviceGroup.create({
        data: {
          user_id: userId,
          endpoint_id: endpointId,
          group_name: '空分组',
        },
      });

      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const response = await request(app)
        .get(`/api/device-groups/${emptyGroup.id}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          start_time: twoHoursAgo.toISOString(),
          end_time: now.toISOString(),
          format: 'csv',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('分组内没有设备');
    });
  });
});

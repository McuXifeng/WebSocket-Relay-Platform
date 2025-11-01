/**
 * Visualization API 集成测试
 * 测试可视化卡片管理 API 的完整流程
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import request from 'supertest';
import app from '@/app';
import prisma from '@/config/database';
import jwt from 'jsonwebtoken';
import { config } from '@/config/env';

describe('Visualization Card API Tests', () => {
  let authToken: string;
  let userId: string;
  let endpointId: string;
  let deviceId: string;

  // 第二个用户用于权限测试
  let otherUserToken: string;
  let otherUserId: string;

  beforeAll(async () => {
    // 创建第一个测试用户并生成 JWT Token
    const user = await prisma.user.create({
      data: {
        username: 'viz_testuser',
        email: 'viz_test@example.com',
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

    // 创建第二个测试用户（用于权限测试）
    const otherUser = await prisma.user.create({
      data: {
        username: 'viz_otheruser',
        email: 'viz_other@example.com',
        password_hash: 'hashed-password',
      },
    });
    otherUserId = otherUser.id;

    otherUserToken = jwt.sign(
      { userId: otherUser.id, username: otherUser.username, isAdmin: false },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 创建测试端点
    const endpoint = await prisma.endpoint.create({
      data: {
        endpoint_id: 'viz-test-ep',
        name: 'Visualization Test Endpoint',
        user_id: userId,
      },
    });
    endpointId = endpoint.id;

    // 创建测试设备
    const device = await prisma.device.create({
      data: {
        endpoint_id: endpointId,
        device_id: 'viz-device-001',
        custom_name: 'Test Device',
      },
    });
    deviceId = device.id;
  });

  afterEach(async () => {
    // 清理测试卡片数据（保留用户、端点、设备）
    await prisma.visualizationCard.deleteMany({ where: { user_id: userId } });
    await prisma.visualizationCard.deleteMany({
      where: { user_id: otherUserId },
    });
  });

  afterAll(async () => {
    // 清理所有测试数据
    await prisma.visualizationCard.deleteMany({ where: { user_id: userId } });
    await prisma.visualizationCard.deleteMany({
      where: { user_id: otherUserId },
    });
    await prisma.device.deleteMany({ where: { id: deviceId } });
    await prisma.endpoint.deleteMany({ where: { id: endpointId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.user.delete({ where: { id: otherUserId } });
    await prisma.$disconnect();
  });

  describe('POST /api/visualization/cards', () => {
    it('应该成功创建卡片配置', async () => {
      const response = await request(app)
        .post('/api/visualization/cards')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          endpointId: endpointId,
          deviceId: deviceId,
          cardType: 'statistic',
          dataKey: 'temperature',
          title: '温度监控',
          config: {
            unit: '°C',
            precision: 1,
          },
          position: { x: 0, y: 0, w: 3, h: 2 },
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(userId);
      expect(response.body.endpointId).toBe(endpointId);
      expect(response.body.deviceId).toBe(deviceId);
      expect(response.body.cardType).toBe('statistic');
      expect(response.body.dataKey).toBe('temperature');
      expect(response.body.title).toBe('温度监控');
      expect(response.body.config).toEqual({
        unit: '°C',
        precision: 1,
      });
      expect(response.body.position).toEqual({ x: 0, y: 0, w: 3, h: 2 });
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('应该在未提供可选字段时使用默认值', async () => {
      const response = await request(app)
        .post('/api/visualization/cards')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cardType: 'status',
          title: '状态指示器',
        });

      expect(response.status).toBe(201);
      expect(response.body.config).toEqual({});
      expect(response.body.position).toEqual({ x: 0, y: 0, w: 3, h: 2 });
    });

    it('应该验证非法endpoint_id失败', async () => {
      const response = await request(app)
        .post('/api/visualization/cards')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          endpointId: 'non-existent-endpoint',
          cardType: 'statistic',
          title: '测试卡片',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('应该在未授权时返回401', async () => {
      const response = await request(app).post('/api/visualization/cards').send({
        cardType: 'statistic',
        title: '测试卡片',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/visualization/cards', () => {
    beforeEach(async () => {
      // 创建测试卡片
      await prisma.visualizationCard.createMany({
        data: [
          {
            user_id: userId,
            endpoint_id: endpointId,
            device_id: deviceId,
            card_type: 'statistic',
            data_key: 'temperature',
            title: '温度卡片',
            config: JSON.stringify({ unit: '°C' }),
            position: JSON.stringify({ x: 0, y: 0, w: 3, h: 2 }),
          },
          {
            user_id: userId,
            endpoint_id: endpointId,
            device_id: deviceId,
            card_type: 'gauge',
            data_key: 'humidity',
            title: '湿度卡片',
            config: JSON.stringify({ unit: '%' }),
            position: JSON.stringify({ x: 3, y: 0, w: 3, h: 2 }),
          },
        ],
      });

      // 创建其他用户的卡片（不应被返回）
      await prisma.visualizationCard.create({
        data: {
          user_id: otherUserId,
          card_type: 'status',
          title: '其他用户的卡片',
          config: JSON.stringify({}),
          position: JSON.stringify({ x: 0, y: 0, w: 3, h: 2 }),
        },
      });
    });

    it('应该只返回当前用户的卡片', async () => {
      const response = await request(app)
        .get('/api/visualization/cards')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('cards');
      expect(Array.isArray(response.body.cards)).toBe(true);
      expect(response.body.cards).toHaveLength(2);

      // 验证所有卡片都属于当前用户
      interface CardResponse {
        userId: string;
      }
      (response.body.cards as CardResponse[]).forEach((card) => {
        expect(card.userId).toBe(userId);
      });
    });

    it('应该返回完整的卡片配置信息', async () => {
      const response = await request(app)
        .get('/api/visualization/cards')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const card = response.body.cards[0];

      expect(card).toHaveProperty('id');
      expect(card).toHaveProperty('userId');
      expect(card).toHaveProperty('cardType');
      expect(card).toHaveProperty('title');
      expect(card).toHaveProperty('config');
      expect(card).toHaveProperty('position');
      expect(card).toHaveProperty('createdAt');
      expect(card).toHaveProperty('updatedAt');
    }, 10000);

    it('应该在未授权时返回401', async () => {
      const response = await request(app).get('/api/visualization/cards');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/visualization/cards/:id', () => {
    let testCardId: string;

    beforeEach(async () => {
      // 创建测试卡片
      const card = await prisma.visualizationCard.create({
        data: {
          user_id: userId,
          endpoint_id: endpointId,
          device_id: deviceId,
          card_type: 'statistic',
          data_key: 'temperature',
          title: '温度卡片',
          config: JSON.stringify({ unit: '°C' }),
          position: JSON.stringify({ x: 0, y: 0, w: 3, h: 2 }),
        },
      });
      testCardId = card.id;
    });

    it('应该成功获取单个卡片配置', async () => {
      const response = await request(app)
        .get(`/api/visualization/cards/${testCardId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testCardId);
      expect(response.body.userId).toBe(userId);
      expect(response.body.title).toBe('温度卡片');
    });

    it('应该在卡片不存在时返回404', async () => {
      const response = await request(app)
        .get('/api/visualization/cards/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('应该验证权限（用户A不能访问用户B的卡片）', async () => {
      const response = await request(app)
        .get(`/api/visualization/cards/${testCardId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/visualization/cards/:id', () => {
    let testCardId: string;

    beforeEach(async () => {
      // 创建测试卡片
      const card = await prisma.visualizationCard.create({
        data: {
          user_id: userId,
          endpoint_id: endpointId,
          device_id: deviceId,
          card_type: 'statistic',
          data_key: 'temperature',
          title: '温度卡片',
          config: JSON.stringify({ unit: '°C' }),
          position: JSON.stringify({ x: 0, y: 0, w: 3, h: 2 }),
        },
      });
      testCardId = card.id;
    });

    it('应该成功更新卡片配置', async () => {
      const response = await request(app)
        .put(`/api/visualization/cards/${testCardId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '温度监控（已更新）',
          config: {
            unit: '°C',
            precision: 2,
            threshold: { warning: 30, danger: 40 },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testCardId);
      expect(response.body.title).toBe('温度监控（已更新）');
      expect(response.body.config).toEqual({
        unit: '°C',
        precision: 2,
        threshold: { warning: 30, danger: 40 },
      });
    });

    it('应该支持部分字段更新（position拖拽）', async () => {
      const response = await request(app)
        .put(`/api/visualization/cards/${testCardId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          position: { x: 6, y: 2, w: 4, h: 3 },
        });

      expect(response.status).toBe(200);
      expect(response.body.position).toEqual({ x: 6, y: 2, w: 4, h: 3 });
      // 验证其他字段未改变
      expect(response.body.title).toBe('温度卡片');
    });

    it('应该验证权限（用户A不能修改用户B的卡片）', async () => {
      const response = await request(app)
        .put(`/api/visualization/cards/${testCardId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          title: '尝试修改',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    }, 10000);

    it('应该在卡片不存在时返回400', async () => {
      const response = await request(app)
        .put('/api/visualization/cards/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '测试',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/visualization/cards/:id', () => {
    let testCardId: string;

    beforeEach(async () => {
      // 创建测试卡片
      const card = await prisma.visualizationCard.create({
        data: {
          user_id: userId,
          endpoint_id: endpointId,
          device_id: deviceId,
          card_type: 'statistic',
          data_key: 'temperature',
          title: '温度卡片',
          config: JSON.stringify({ unit: '°C' }),
          position: JSON.stringify({ x: 0, y: 0, w: 3, h: 2 }),
        },
      });
      testCardId = card.id;
    });

    it('应该成功删除卡片', async () => {
      const response = await request(app)
        .delete(`/api/visualization/cards/${testCardId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Card deleted successfully');

      // 验证卡片已从数据库中删除
      const card = await prisma.visualizationCard.findUnique({
        where: { id: testCardId },
      });
      expect(card).toBeNull();
    });

    it('应该验证权限（用户A不能删除用户B的卡片）', async () => {
      const response = await request(app)
        .delete(`/api/visualization/cards/${testCardId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');

      // 验证卡片未被删除
      const card = await prisma.visualizationCard.findUnique({
        where: { id: testCardId },
      });
      expect(card).not.toBeNull();
    });

    it('应该在卡片不存在时返回404', async () => {
      const response = await request(app)
        .delete('/api/visualization/cards/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});

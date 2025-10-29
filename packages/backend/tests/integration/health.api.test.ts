/**
 * 健康检查路由集成测试
 * 测试 GET /api/health 端点的功能和响应格式
 */

import request from 'supertest';
import app from '../../src/app.js';

describe('GET /api/health', () => {
  // 设置测试环境变量
  beforeAll(() => {
    process.env.ALLOWED_ORIGINS = 'http://localhost:5173,http://localhost:3000';
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test_db';
  });

  it('应该返回 200 状态码', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
  });

  it('应该返回正确的 JSON 格式 { status: "ok" } 并设置 Content-Type', async () => {
    const response = await request(app).get('/api/health');

    expect(response.body).toEqual({ status: 'ok' });
    // 验证 Content-Type (Express 自动设置为 application/json)
    expect(response.type).toBe('application/json');
  });

  it('应该支持 CORS (包含 Access-Control-Allow-Origin 头)', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');

    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  it('应该支持携带凭证 (Access-Control-Allow-Credentials)', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');

    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
});

describe('错误路由处理', () => {
  beforeAll(() => {
    process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
    process.env.NODE_ENV = 'test';
  });

  it('访问不存在的路由应该返回 404', async () => {
    const response = await request(app).get('/api/nonexistent');

    expect(response.status).toBe(404);
  });

  it('404 错误应该返回统一的错误格式', async () => {
    const response = await request(app).get('/api/nonexistent');

    // 类型断言: response.body 符合错误响应格式
    const body = response.body as {
      error: { code: string; message: string; timestamp: string; requestId: string };
    };

    expect(response.body).toHaveProperty('error');
    expect(body.error).toHaveProperty('code');
    expect(body.error).toHaveProperty('message');
    expect(body.error).toHaveProperty('timestamp');
    expect(body.error).toHaveProperty('requestId');
  });
});

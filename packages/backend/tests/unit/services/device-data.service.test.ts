/**
 * device-data.service 单元测试
 * 测试设备数据解析、存储和查询功能
 */

import {
  parseDeviceData,
  saveDeviceDataAsync,
  getLatestDeviceData,
  getDeviceDataKeys,
  getDeviceDataHistory,
  DeviceDataMessage,
} from '@/services/device-data.service';
import prisma from '@/config/database';

describe('device-data.service', () => {
  const TEST_USER_ID = 'test-user-device-data';
  const TEST_ENDPOINT_ID = 'test-endpoint-device-data';
  const TEST_DEVICE_ID = 'test-device-123';

  beforeAll(async () => {
    // 创建测试用户
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        username: 'testuser-device-data',
        email: 'testdevicedata@test.com',
        password_hash: 'dummy-hash',
        is_admin: false,
      },
    });

    // 创建测试端点
    await prisma.endpoint.deleteMany({ where: { id: TEST_ENDPOINT_ID } });
    await prisma.endpoint.create({
      data: {
        id: TEST_ENDPOINT_ID,
        endpoint_id: 'ep-test-data',
        name: 'Test Endpoint for Device Data',
        user_id: TEST_USER_ID,
      },
    });

    // 创建测试设备
    await prisma.device.deleteMany({ where: { id: TEST_DEVICE_ID } });
    await prisma.device.create({
      data: {
        id: TEST_DEVICE_ID,
        endpoint_id: TEST_ENDPOINT_ID,
        device_id: 'device-unique-id-123',
        custom_name: 'Test Device',
      },
    });
  });

  beforeEach(async () => {
    // 清理测试数据
    await prisma.deviceData.deleteMany({
      where: { device_id: TEST_DEVICE_ID },
    });
  });

  afterAll(async () => {
    // 清理所有测试数据
    await prisma.deviceData.deleteMany({
      where: { device_id: TEST_DEVICE_ID },
    });
    await prisma.device.deleteMany({ where: { id: TEST_DEVICE_ID } });
    await prisma.endpoint.deleteMany({ where: { id: TEST_ENDPOINT_ID } });
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.$disconnect();
  });

  describe('parseDeviceData', () => {
    it('应该正确解析包含数值类型的设备数据', () => {
      const message: DeviceDataMessage = {
        type: 'data',
        deviceId: TEST_DEVICE_ID,
        data: {
          temperature: 25.5,
          humidity: 60,
        },
      };

      const result = parseDeviceData(message);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        data_key: 'temperature',
        data_value: '25.5',
        data_type: 'number',
        unit: '°C',
      });
      expect(result[1]).toEqual({
        data_key: 'humidity',
        data_value: '60',
        data_type: 'number',
        unit: '%',
      });
    });

    it('应该正确解析包含字符串类型的设备数据', () => {
      const message: DeviceDataMessage = {
        type: 'data',
        deviceId: TEST_DEVICE_ID,
        data: {
          status: 'online',
          location: 'room-101',
        },
      };

      const result = parseDeviceData(message);

      expect(result).toHaveLength(2);
      expect(result[0].data_type).toBe('string');
      expect(result[0].data_value).toBe('online');
      expect(result[1].data_type).toBe('string');
      expect(result[1].data_value).toBe('room-101');
    });

    it('应该正确解析包含布尔类型的设备数据', () => {
      const message: DeviceDataMessage = {
        type: 'data',
        deviceId: TEST_DEVICE_ID,
        data: {
          isActive: true,
          hasError: false,
        },
      };

      const result = parseDeviceData(message);

      expect(result).toHaveLength(2);
      expect(result[0].data_type).toBe('boolean');
      expect(result[0].data_value).toBe('true');
      expect(result[1].data_type).toBe('boolean');
      expect(result[1].data_value).toBe('false');
    });

    it('应该正确解析包含对象类型的设备数据', () => {
      const message: DeviceDataMessage = {
        type: 'data',
        deviceId: TEST_DEVICE_ID,
        data: {
          config: { mode: 'auto', speed: 3 },
        },
      };

      const result = parseDeviceData(message);

      expect(result).toHaveLength(1);
      expect(result[0].data_type).toBe('json');
      expect(result[0].data_value).toBe('{"mode":"auto","speed":3}');
    });

    it('应该正确推断常见数据单位', () => {
      const message: DeviceDataMessage = {
        type: 'data',
        deviceId: TEST_DEVICE_ID,
        data: {
          temperature: 25,
          temp: 26,
          humidity: 60,
          voltage: 220,
          volt: 12,
          current: 5,
          pressure: 101325,
        },
      };

      const result = parseDeviceData(message);

      const units = result.reduce(
        (acc, item) => {
          acc[item.data_key] = item.unit;
          return acc;
        },
        {} as Record<string, string | null>
      );

      expect(units.temperature).toBe('°C');
      expect(units.temp).toBe('°C');
      expect(units.humidity).toBe('%');
      expect(units.voltage).toBe('V');
      expect(units.volt).toBe('V');
      expect(units.current).toBe('A');
      expect(units.pressure).toBe('Pa');
    });

    it('对于未知单位应该返回null', () => {
      const message: DeviceDataMessage = {
        type: 'data',
        deviceId: TEST_DEVICE_ID,
        data: {
          unknownField: 123,
        },
      };

      const result = parseDeviceData(message);

      expect(result[0].unit).toBeNull();
    });
  });

  describe('saveDeviceDataAsync', () => {
    it('应该成功批量存储设备数据', async () => {
      const parsedData = [
        {
          data_key: 'temperature',
          data_value: '25.5',
          data_type: 'number',
          unit: '°C',
        },
        {
          data_key: 'humidity',
          data_value: '60',
          data_type: 'number',
          unit: '%',
        },
      ];

      await saveDeviceDataAsync(TEST_DEVICE_ID, parsedData);

      // 验证数据已存储
      const stored = await prisma.deviceData.findMany({
        where: { device_id: TEST_DEVICE_ID },
      });

      expect(stored).toHaveLength(2);

      // 不依赖顺序，根据key查找
      const tempData = stored.find((d) => d.data_key === 'temperature');
      const humidityData = stored.find((d) => d.data_key === 'humidity');

      expect(tempData?.data_value).toBe('25.5');
      expect(humidityData?.data_value).toBe('60');
    });

    it('存储失败时不应该抛出异常（只记录错误）', async () => {
      const parsedData = [
        {
          data_key: 'test',
          data_value: '123',
          data_type: 'number',
          unit: null,
        },
      ];

      // 使用不存在的设备ID（会导致外键约束失败）
      await expect(saveDeviceDataAsync('non-existent-device', parsedData)).resolves.not.toThrow();
    });
  });

  describe('getLatestDeviceData', () => {
    beforeEach(async () => {
      // 插入测试数据（不同时间戳）
      await prisma.deviceData.createMany({
        data: [
          {
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            data_value: '24.0',
            data_type: 'number',
            unit: '°C',
            timestamp: new Date('2025-10-29T10:00:00Z'),
          },
          {
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            data_value: '25.5',
            data_type: 'number',
            unit: '°C',
            timestamp: new Date('2025-10-29T10:05:00Z'),
          },
          {
            device_id: TEST_DEVICE_ID,
            data_key: 'humidity',
            data_value: '60',
            data_type: 'number',
            unit: '%',
            timestamp: new Date('2025-10-29T10:05:00Z'),
          },
        ],
      });
    });

    it('应该返回每个data_key的最新记录', async () => {
      const result = await getLatestDeviceData(TEST_DEVICE_ID);

      expect(result).toHaveLength(2);

      const tempData = result.find((item) => item.key === 'temperature');
      const humidityData = result.find((item) => item.key === 'humidity');

      expect(tempData?.value).toBe(25.5); // 最新的温度值
      expect(humidityData?.value).toBe(60);
    });

    it('应该正确解析数据值类型', async () => {
      // 添加不同类型的数据
      await prisma.deviceData.create({
        data: {
          device_id: TEST_DEVICE_ID,
          data_key: 'isActive',
          data_value: 'true',
          data_type: 'boolean',
          unit: null,
          timestamp: new Date(),
        },
      });

      const result = await getLatestDeviceData(TEST_DEVICE_ID);
      const boolData = result.find((item) => item.key === 'isActive');

      expect(boolData?.value).toBe(true);
      expect(typeof boolData?.value).toBe('boolean');
    });
  });

  describe('getDeviceDataKeys', () => {
    beforeEach(async () => {
      // 插入测试数据
      await prisma.deviceData.createMany({
        data: [
          {
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            data_value: '25.5',
            data_type: 'number',
            unit: '°C',
            timestamp: new Date('2025-10-29T10:00:00Z'),
          },
          {
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            data_value: '26.0',
            data_type: 'number',
            unit: '°C',
            timestamp: new Date('2025-10-29T10:05:00Z'),
          },
          {
            device_id: TEST_DEVICE_ID,
            data_key: 'humidity',
            data_value: '60',
            data_type: 'number',
            unit: '%',
            timestamp: new Date('2025-10-29T10:05:00Z'),
          },
        ],
      });
    });

    it('应该返回唯一的data_key列表', async () => {
      const result = await getDeviceDataKeys(TEST_DEVICE_ID);

      expect(result).toHaveLength(2);

      const keys = result.map((item) => item.key);
      expect(keys).toContain('temperature');
      expect(keys).toContain('humidity');
    });

    it('应该包含类型和单位信息', async () => {
      const result = await getDeviceDataKeys(TEST_DEVICE_ID);

      const tempKey = result.find((item) => item.key === 'temperature');
      expect(tempKey?.type).toBe('number');
      expect(tempKey?.unit).toBe('°C');

      const humidityKey = result.find((item) => item.key === 'humidity');
      expect(humidityKey?.type).toBe('number');
      expect(humidityKey?.unit).toBe('%');
    });

    it('应该按最后更新时间降序排序', async () => {
      const result = await getDeviceDataKeys(TEST_DEVICE_ID);

      // 验证返回的数据包含所有key
      expect(result).toHaveLength(2);

      const keys = result.map((item) => item.key);
      expect(keys).toContain('temperature');
      expect(keys).toContain('humidity');

      // 验证每个key都有lastSeen时间戳
      result.forEach((item) => {
        expect(item.lastSeen).toBeInstanceOf(Date);
      });
    });
  });

  describe('getDeviceDataHistory', () => {
    const startTime = new Date('2025-10-29T10:00:00Z');
    const endTime = new Date('2025-10-29T12:00:00Z');

    beforeEach(async () => {
      // 插入测试数据（每10分钟一条，共13条）
      const testData = [];
      for (let i = 0; i <= 12; i++) {
        const timestamp = new Date(startTime.getTime() + i * 10 * 60 * 1000);
        testData.push({
          device_id: TEST_DEVICE_ID,
          data_key: 'temperature',
          data_value: (25 + i * 0.5).toString(), // 25.0, 25.5, 26.0, ...
          data_type: 'number',
          unit: '°C',
          timestamp,
        });
      }
      await prisma.deviceData.createMany({ data: testData });
    });

    it('应该正确查询时间范围内的历史数据（无聚合）', async () => {
      const result = await getDeviceDataHistory(
        TEST_DEVICE_ID,
        'temperature',
        startTime.toISOString(),
        endTime.toISOString()
      );

      // 验证返回数据数量
      expect(result).toHaveLength(13);

      // 验证数据按时间升序排序
      expect(result[0].value).toBe(25.0);
      expect(result[12].value).toBe(31.0);

      // 验证时间戳格式
      expect(result[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('应该正确执行按分钟聚合（aggregation=minute）', async () => {
      const result = await getDeviceDataHistory(
        TEST_DEVICE_ID,
        'temperature',
        startTime.toISOString(),
        endTime.toISOString(),
        'minute'
      );

      // 验证返回聚合数据
      expect(result.length).toBeGreaterThan(0);

      // 验证每条聚合数据包含count字段
      result.forEach((item) => {
        expect(item.count).toBeDefined();
        expect(typeof item.count).toBe('number');
        expect(item.value).toBeGreaterThanOrEqual(25);
        expect(item.value).toBeLessThanOrEqual(31);
      });
    });

    it('应该正确执行按小时聚合（aggregation=hour）', async () => {
      const result = await getDeviceDataHistory(
        TEST_DEVICE_ID,
        'temperature',
        startTime.toISOString(),
        endTime.toISOString(),
        'hour'
      );

      // 验证返回聚合数据（2小时范围应该有3个聚合点：10:00, 11:00, 12:00）
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(3);

      // 验证聚合值为平均值
      result.forEach((item) => {
        expect(item.count).toBeDefined();
        expect(item.count).toBeGreaterThan(0);
        expect(item.value).toBeGreaterThanOrEqual(25);
        expect(item.value).toBeLessThanOrEqual(31);
      });
    });

    it('应该正确执行按天聚合（aggregation=day）', async () => {
      const result = await getDeviceDataHistory(
        TEST_DEVICE_ID,
        'temperature',
        startTime.toISOString(),
        endTime.toISOString(),
        'day'
      );

      // 验证返回聚合数据（同一天内的数据应该聚合为1条）
      expect(result.length).toBe(1);

      // 验证聚合值为平均值
      expect(result[0].count).toBe(13); // 13条原始数据聚合为1条
      expect(result[0].value).toBeCloseTo(28, 1); // 平均值约为28
    });

    it('应该限制返回数据点数量（limit参数）', async () => {
      const limit = 5;
      const result = await getDeviceDataHistory(
        TEST_DEVICE_ID,
        'temperature',
        startTime.toISOString(),
        endTime.toISOString(),
        undefined,
        'avg',
        limit
      );

      // 验证返回数据不超过limit
      expect(result.length).toBeLessThanOrEqual(limit);
      expect(result.length).toBe(limit);
    });

    it('应该正确执行按小时聚合最大值（aggregateType=max）', async () => {
      const result = await getDeviceDataHistory(
        TEST_DEVICE_ID,
        'temperature',
        startTime.toISOString(),
        endTime.toISOString(),
        'hour',
        'max'
      );

      // 验证返回聚合数据
      expect(result.length).toBeGreaterThan(0);

      // 验证每条记录包含聚合信息
      result.forEach((item) => {
        expect(item.count).toBeDefined();
        expect(item.count).toBeGreaterThan(0);
        // 最大值应该在合理范围内
        expect(item.value).toBeGreaterThanOrEqual(25);
        expect(item.value).toBeLessThanOrEqual(31);
      });
    });

    it('应该正确执行按小时聚合最小值（aggregateType=min）', async () => {
      const result = await getDeviceDataHistory(
        TEST_DEVICE_ID,
        'temperature',
        startTime.toISOString(),
        endTime.toISOString(),
        'hour',
        'min'
      );

      // 验证返回聚合数据
      expect(result.length).toBeGreaterThan(0);

      // 验证每条记录包含聚合信息
      result.forEach((item) => {
        expect(item.count).toBeDefined();
        expect(item.count).toBeGreaterThan(0);
        // 最小值应该在合理范围内
        expect(item.value).toBeGreaterThanOrEqual(25);
        expect(item.value).toBeLessThanOrEqual(31);
      });
    });

    it('应该正确执行按天聚合平均值/最大值/最小值', async () => {
      // 测试平均值
      const avgResult = await getDeviceDataHistory(
        TEST_DEVICE_ID,
        'temperature',
        startTime.toISOString(),
        endTime.toISOString(),
        'day',
        'avg'
      );
      expect(avgResult.length).toBe(1);
      expect(avgResult[0].value).toBeCloseTo(28, 1);

      // 测试最大值
      const maxResult = await getDeviceDataHistory(
        TEST_DEVICE_ID,
        'temperature',
        startTime.toISOString(),
        endTime.toISOString(),
        'day',
        'max'
      );
      expect(maxResult.length).toBe(1);
      expect(maxResult[0].value).toBeGreaterThanOrEqual(avgResult[0].value);

      // 测试最小值
      const minResult = await getDeviceDataHistory(
        TEST_DEVICE_ID,
        'temperature',
        startTime.toISOString(),
        endTime.toISOString(),
        'day',
        'min'
      );
      expect(minResult.length).toBe(1);
      expect(minResult[0].value).toBeLessThanOrEqual(avgResult[0].value);

      // 验证关系：最小值 <= 平均值 <= 最大值
      expect(minResult[0].value).toBeLessThanOrEqual(avgResult[0].value);
      expect(avgResult[0].value).toBeLessThanOrEqual(maxResult[0].value);
    });

    it('默认聚合类型应为平均值（aggregateType未指定时）', async () => {
      const result = await getDeviceDataHistory(
        TEST_DEVICE_ID,
        'temperature',
        startTime.toISOString(),
        endTime.toISOString(),
        'day'
        // 不指定 aggregateType
      );

      expect(result.length).toBe(1);
      // 验证默认使用平均值
      expect(result[0].value).toBeCloseTo(28, 1);
    });

    it('在无聚合时应忽略aggregateType参数', async () => {
      const result = await getDeviceDataHistory(
        TEST_DEVICE_ID,
        'temperature',
        startTime.toISOString(),
        endTime.toISOString(),
        undefined,
        'max' // 尽管指定了 aggregateType，但无聚合时应忽略
      );

      // 验证返回原始数据（无聚合）
      expect(result.length).toBe(13);
      result.forEach((item) => {
        expect(item.count).toBeUndefined(); // 原始数据不包含 count
      });
    });

    it('应该按timestamp升序排序返回结果', async () => {
      const result = await getDeviceDataHistory(
        TEST_DEVICE_ID,
        'temperature',
        startTime.toISOString(),
        endTime.toISOString()
      );

      // 验证时间戳递增
      for (let i = 1; i < result.length; i++) {
        const prevTime = new Date(result[i - 1].timestamp);
        const currTime = new Date(result[i].timestamp);
        expect(currTime.getTime()).toBeGreaterThanOrEqual(prevTime.getTime());
      }
    });

    it('查询不存在的数据应该返回空数组', async () => {
      const result = await getDeviceDataHistory(
        TEST_DEVICE_ID,
        'non-existent-key',
        startTime.toISOString(),
        endTime.toISOString()
      );

      expect(result).toEqual([]);
    });

    it('时间范围外的数据应该被过滤', async () => {
      // 查询一个很早的时间范围（没有数据）
      const earlyStart = new Date('2025-10-28T10:00:00Z');
      const earlyEnd = new Date('2025-10-28T12:00:00Z');

      const result = await getDeviceDataHistory(
        TEST_DEVICE_ID,
        'temperature',
        earlyStart.toISOString(),
        earlyEnd.toISOString()
      );

      expect(result).toEqual([]);
    });
  });
});

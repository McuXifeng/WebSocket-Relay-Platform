import { Request, Response } from 'express';
import {
  createCard,
  findAllCards,
  findOneCard,
  updateCard,
  deleteCard,
  CreateCardDto,
  UpdateCardDto,
} from '../services/visualization-card.service';
import {
  getDeviceDataHistory,
  DeviceDataHistory,
} from '../services/device-data.service';
import prisma from '../config/database.js';

// 请求体类型定义
interface CreateCardRequestBody {
  endpointId?: string;
  deviceId?: string;
  cardType: string;
  dataKey?: string;
  title: string;
  config?: Record<string, unknown>;
  position?: Record<string, unknown>;
}

interface UpdateCardRequestBody {
  endpointId?: string;
  deviceId?: string;
  cardType?: string;
  dataKey?: string;
  title?: string;
  config?: Record<string, unknown>;
  position?: Record<string, unknown>;
}

/**
 * 创建卡片配置
 * POST /api/visualization/cards
 */
export async function createCardHandler(
  req: Request<unknown, unknown, CreateCardRequestBody>,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: '未授权访问' });
      return;
    }

    const body = req.body;
    const cardData: CreateCardDto = {
      endpointId: body.endpointId,
      deviceId: body.deviceId,
      cardType: body.cardType,
      dataKey: body.dataKey,
      title: body.title,
      config: JSON.stringify(body.config || {}),
      position: JSON.stringify(body.position || { x: 0, y: 0, w: 3, h: 2 }),
    };

    const card = await createCard(userId, cardData);

    res.status(201).json({
      id: card.id,
      userId: card.user_id,
      endpointId: card.endpoint_id,
      deviceId: card.device_id,
      cardType: card.card_type,
      dataKey: card.data_key,
      title: card.title,
      config: JSON.parse(card.config) as Record<string, unknown>,
      position: JSON.parse(card.position) as Record<string, unknown>,
      createdAt: card.created_at.toISOString(),
      updatedAt: card.updated_at.toISOString(),
    });
  } catch (error) {
    console.error('创建卡片失败:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : '创建卡片失败',
    });
  }
}

/**
 * 获取用户所有卡片配置
 * GET /api/visualization/cards
 */
export async function getAllCardsHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: '未授权访问' });
      return;
    }

    const cards = await findAllCards(userId);

    res.status(200).json({
      cards: cards.map((card) => ({
        id: card.id,
        userId: card.user_id,
        endpointId: card.endpoint_id,
        deviceId: card.device_id,
        cardType: card.card_type,
        dataKey: card.data_key,
        title: card.title,
        config: JSON.parse(card.config) as Record<string, unknown>,
        position: JSON.parse(card.position) as Record<string, unknown>,
        createdAt: card.created_at.toISOString(),
        updatedAt: card.updated_at.toISOString(),
      })),
    });
  } catch (error) {
    console.error('获取卡片列表失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '获取卡片列表失败',
    });
  }
}

/**
 * 获取单个卡片配置
 * GET /api/visualization/cards/:id
 */
export async function getCardHandler(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: '未授权访问' });
      return;
    }

    const cardId = req.params.id;
    const card = await findOneCard(cardId, userId);

    res.status(200).json({
      id: card.id,
      userId: card.user_id,
      endpointId: card.endpoint_id,
      deviceId: card.device_id,
      cardType: card.card_type,
      dataKey: card.data_key,
      title: card.title,
      config: JSON.parse(card.config) as Record<string, unknown>,
      position: JSON.parse(card.position) as Record<string, unknown>,
      createdAt: card.created_at.toISOString(),
      updatedAt: card.updated_at.toISOString(),
    });
  } catch (error) {
    console.error('获取卡片失败:', error);
    res.status(404).json({
      error: error instanceof Error ? error.message : '获取卡片失败',
    });
  }
}

/**
 * 更新卡片配置
 * PUT /api/visualization/cards/:id
 */
export async function updateCardHandler(
  req: Request<{ id: string }, unknown, UpdateCardRequestBody>,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: '未授权访问' });
      return;
    }

    const cardId = req.params.id;
    const body = req.body;

    const updateData: UpdateCardDto = {};
    if (body.endpointId !== undefined) updateData.endpointId = body.endpointId;
    if (body.deviceId !== undefined) updateData.deviceId = body.deviceId;
    if (body.cardType !== undefined) updateData.cardType = body.cardType;
    if (body.dataKey !== undefined) updateData.dataKey = body.dataKey;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.config !== undefined) updateData.config = JSON.stringify(body.config);
    if (body.position !== undefined)
      updateData.position = JSON.stringify(body.position);

    const card = await updateCard(cardId, userId, updateData);

    res.status(200).json({
      id: card.id,
      userId: card.user_id,
      endpointId: card.endpoint_id,
      deviceId: card.device_id,
      cardType: card.card_type,
      dataKey: card.data_key,
      title: card.title,
      config: JSON.parse(card.config) as Record<string, unknown>,
      position: JSON.parse(card.position) as Record<string, unknown>,
      createdAt: card.created_at.toISOString(),
      updatedAt: card.updated_at.toISOString(),
    });
  } catch (error) {
    console.error('更新卡片失败:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : '更新卡片失败',
    });
  }
}

/**
 * 删除卡片配置
 * DELETE /api/visualization/cards/:id
 */
export async function deleteCardHandler(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: '未授权访问' });
      return;
    }

    const cardId = req.params.id;
    await deleteCard(cardId, userId);

    res.status(200).json({
      success: true,
      message: 'Card deleted successfully',
    });
  } catch (error) {
    console.error('删除卡片失败:', error);
    res.status(404).json({
      error: error instanceof Error ? error.message : '删除卡片失败',
    });
  }
}

/**
 * 获取设备历史数据
 * GET /api/endpoints/:endpointId/devices/:deviceId/data/history
 */
export async function getDeviceDataHistoryHandler(
  req: Request<
    { endpointId: string; deviceId: string },
    unknown,
    unknown,
    {
      dataKey: string;
      startTime: string;
      endTime: string;
      aggregation?: 'minute' | 'hour' | 'day';
      limit?: string;
    }
  >,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: '未授权访问' });
      return;
    }

    const { endpointId, deviceId } = req.params;
    const { dataKey, startTime, endTime, aggregation, limit } = req.query;

    // 验证必填参数
    if (!dataKey || !startTime || !endTime) {
      res.status(400).json({
        error: '缺少必填参数: dataKey, startTime, endTime',
      });
      return;
    }

    // 验证时间格式
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.status(400).json({
        error: '无效的时间格式，请使用ISO 8601格式',
      });
      return;
    }

    // 验证aggregation参数
    if (aggregation && !['minute', 'hour', 'day'].includes(aggregation)) {
      res.status(400).json({
        error: '无效的aggregation参数，只支持: minute, hour, day',
      });
      return;
    }

    // 验证端点存在
    const endpoint = await prisma.endpoint.findUnique({
      where: {
        id: endpointId,
      },
    });

    if (!endpoint) {
      res.status(404).json({ error: '端点不存在' });
      return;
    }

    // 验证端点归属
    if (endpoint.user_id !== userId) {
      res.status(403).json({ error: '无权访问该端点' });
      return;
    }

    // 验证设备存在且关联到该端点
    const device = await prisma.device.findFirst({
      where: {
        id: deviceId,
        endpoint_id: endpointId,
      },
    });

    if (!device) {
      res.status(404).json({ error: '设备不存在或无权访问' });
      return;
    }

    // 查询历史数据
    const records = await getDeviceDataHistory(
      deviceId,
      dataKey,
      startTime,
      endTime,
      aggregation,
      limit ? parseInt(limit, 10) : 1000
    );

    // 构造响应
    const response: DeviceDataHistory = {
      deviceId: device.id,
      deviceName: device.name || device.device_id,
      dataKey,
      timeRange: {
        startTime,
        endTime,
      },
      aggregation,
      records,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('获取设备历史数据失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '获取设备历史数据失败',
    });
  }
}

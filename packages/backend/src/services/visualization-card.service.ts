import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 创建卡片DTO
export interface CreateCardDto {
  endpointId?: string;
  deviceId?: string;
  cardType: string;
  dataKey?: string;
  title: string;
  config: string; // JSON格式
  position: string; // JSON格式
}

// 更新卡片DTO
export interface UpdateCardDto {
  endpointId?: string;
  deviceId?: string;
  cardType?: string;
  dataKey?: string;
  title?: string;
  config?: string;
  position?: string;
}

/**
 * 创建卡片配置
 * @param userId 用户ID
 * @param data 创建卡片数据
 * @returns 创建的卡片配置
 */
export async function createCard(userId: string, data: CreateCardDto) {
  // 验证 endpoint_id 和 device_id 存在且属于用户
  if (data.endpointId) {
    const endpoint = await prisma.endpoint.findFirst({
      where: {
        id: data.endpointId,
        user_id: userId,
      },
    });

    if (!endpoint) {
      throw new Error('端点不存在或不属于当前用户');
    }
  }

  if (data.deviceId) {
    const device = await prisma.device.findFirst({
      where: {
        id: data.deviceId,
        endpoint: {
          user_id: userId,
        },
      },
    });

    if (!device) {
      throw new Error('设备不存在或不属于当前用户');
    }
  }

  // 使用 Prisma create 创建记录
  const card = await prisma.visualizationCard.create({
    data: {
      user_id: userId,
      endpoint_id: data.endpointId,
      device_id: data.deviceId,
      card_type: data.cardType,
      data_key: data.dataKey,
      title: data.title,
      config: data.config,
      position: data.position,
    },
  });

  return card;
}

/**
 * 获取用户所有卡片配置
 * @param userId 用户ID
 * @returns 卡片配置数组
 */
export async function findAllCards(userId: string) {
  const cards = await prisma.visualizationCard.findMany({
    where: {
      user_id: userId,
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  return cards;
}

/**
 * 获取单个卡片配置
 * @param id 卡片ID
 * @param userId 用户ID
 * @returns 卡片配置或null
 */
export async function findOneCard(id: string, userId: string) {
  const card = await prisma.visualizationCard.findFirst({
    where: {
      id,
      user_id: userId,
    },
  });

  if (!card) {
    throw new Error('卡片不存在或不属于当前用户');
  }

  return card;
}

/**
 * 更新卡片配置
 * @param id 卡片ID
 * @param userId 用户ID
 * @param data 更新数据
 * @returns 更新后的卡片配置
 */
export async function updateCard(
  id: string,
  userId: string,
  data: UpdateCardDto
) {
  // 验证卡片属于用户
  const existingCard = await prisma.visualizationCard.findFirst({
    where: {
      id,
      user_id: userId,
    },
  });

  if (!existingCard) {
    throw new Error('卡片不存在或不属于当前用户');
  }

  // 验证 endpoint_id 和 device_id（如果有更新）
  if (data.endpointId !== undefined) {
    if (data.endpointId) {
      const endpoint = await prisma.endpoint.findFirst({
        where: {
          id: data.endpointId,
          user_id: userId,
        },
      });

      if (!endpoint) {
        throw new Error('端点不存在或不属于当前用户');
      }
    }
  }

  if (data.deviceId !== undefined) {
    if (data.deviceId) {
      const device = await prisma.device.findFirst({
        where: {
          id: data.deviceId,
          endpoint: {
            user_id: userId,
          },
        },
      });

      if (!device) {
        throw new Error('设备不存在或不属于当前用户');
      }
    }
  }

  // 使用 Prisma update 更新记录
  const card = await prisma.visualizationCard.update({
    where: {
      id,
    },
    data: {
      endpoint_id: data.endpointId,
      device_id: data.deviceId,
      card_type: data.cardType,
      data_key: data.dataKey,
      title: data.title,
      config: data.config,
      position: data.position,
    },
  });

  return card;
}

/**
 * 删除卡片配置
 * @param id 卡片ID
 * @param userId 用户ID
 */
export async function deleteCard(id: string, userId: string): Promise<void> {
  // 验证卡片属于用户
  const existingCard = await prisma.visualizationCard.findFirst({
    where: {
      id,
      user_id: userId,
    },
  });

  if (!existingCard) {
    throw new Error('卡片不存在或不属于当前用户');
  }

  // 使用 Prisma delete 删除记录
  await prisma.visualizationCard.delete({
    where: {
      id,
    },
  });
}

import { api } from './api';

export interface CardConfig {
  unit?: string;
  color?: string;
  precision?: number;
  threshold?: {
    warning: number;
    danger: number;
  };
  refreshInterval?: number;

  // 图表类型卡片的额外配置
  chartType?: 'line' | 'bar';
  timeRange?: {
    type: 'quick' | 'custom';
    quick?: '1h' | '24h' | '7d';
    custom?: {
      startTime: string;
      endTime: string;
    };
  };
  dataSources?: Array<{
    deviceId: string;
    dataKey: string;
    label: string;
    color?: string;
  }>;
  aggregation?: 'minute' | 'hour' | 'day';
  maxDataPoints?: number;
}

export interface CardPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface VisualizationCard {
  id: string;
  userId: string;
  endpointId?: string;
  deviceId?: string;
  cardType: 'statistic' | 'gauge' | 'chart' | 'status';
  dataKey?: string;
  title: string;
  config: CardConfig;
  position: CardPosition;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCardDto {
  endpointId?: string;
  deviceId?: string;
  cardType: 'statistic' | 'gauge' | 'chart' | 'status';
  dataKey?: string;
  title: string;
  config: CardConfig;
  position: CardPosition;
}

export interface UpdateCardDto extends Partial<CreateCardDto> {}

export interface LatestData {
  key: string;
  value: string;
  type: string;
  unit?: string;
  timestamp: string;
}

export interface DeviceDataResponse {
  deviceId: string;
  deviceName: string;
  lastUpdate: string;
  data: LatestData[];
}

export interface DataKey {
  key: string;
  type: string;
  unit?: string;
  lastSeen: string;
}

export interface DataKeysResponse {
  deviceId: string;
  dataKeys: DataKey[];
}

/**
 * 历史数据记录
 */
export interface HistoricalDataRecord {
  timestamp: string;
  value: number;
  count?: number; // 聚合时包含：参与聚合的原始数据点数量
}

/**
 * 历史数据查询响应
 */
export interface DeviceDataHistoryResponse {
  deviceId: string;
  deviceName: string;
  dataKey: string;
  timeRange: {
    startTime: string;
    endTime: string;
  };
  aggregation?: string;
  aggregateType?: 'avg' | 'max' | 'min'; // 聚合类型（新增）
  records: HistoricalDataRecord[];
}

/**
 * 创建可视化卡片配置
 */
export async function createCard(cardData: CreateCardDto): Promise<VisualizationCard> {
  // axios 拦截器已返回 response.data，这里直接得到后端返回的对象
  const response = await api.post<VisualizationCard>('/visualization/cards', cardData);
  return response;
}

/**
 * 获取用户所有卡片配置
 */
export async function getAllCards(): Promise<VisualizationCard[]> {
  // axios 拦截器已返回 response.data，这里直接得到 { cards: [...] }
  const response = await api.get<{ cards: VisualizationCard[] }>('/visualization/cards');
  return response.cards;
}

/**
 * 获取单个卡片配置
 */
export async function getCard(id: string): Promise<VisualizationCard> {
  // axios 拦截器已返回 response.data，这里直接得到后端返回的对象
  const response = await api.get<VisualizationCard>(`/visualization/cards/${id}`);
  return response;
}

/**
 * 更新卡片配置
 */
export async function updateCard(id: string, cardData: UpdateCardDto): Promise<VisualizationCard> {
  // axios 拦截器已返回 response.data，这里直接得到后端返回的对象
  const response = await api.put<VisualizationCard>(`/visualization/cards/${id}`, cardData);
  return response;
}

/**
 * 删除卡片配置
 */
export async function deleteCard(id: string): Promise<void> {
  await api.delete(`/visualization/cards/${id}`);
}

/**
 * 获取设备最新数据
 */
export async function getDeviceData(
  endpointId: string,
  deviceId: string
): Promise<DeviceDataResponse> {
  // axios 拦截器已返回 response.data，这里直接得到后端返回的对象
  const response = await api.get<DeviceDataResponse>(
    `/endpoints/${endpointId}/devices/${deviceId}/data`
  );
  return response;
}

/**
 * 获取设备可用数据字段列表
 */
export async function getDeviceDataKeys(
  endpointId: string,
  deviceId: string
): Promise<DataKeysResponse> {
  // axios 拦截器已返回 response.data，这里直接得到后端返回的对象
  const response = await api.get<DataKeysResponse>(
    `/endpoints/${endpointId}/devices/${deviceId}/data-keys`
  );
  return response;
}

/**
 * 获取设备历史数据（用于图表展示）
 *
 * @param endpointId - Endpoint ID
 * @param deviceId - Device ID
 * @param dataKey - 数据字段键
 * @param startTime - 开始时间（ISO 8601格式）
 * @param endTime - 结束时间（ISO 8601格式）
 * @param aggregation - 数据聚合粒度（可选：'minute' | 'hour' | 'day'）
 * @param aggregateType - 聚合统计类型（可选：'avg' | 'max' | 'min'）
 * @param limit - 最大返回数据点数量（可选，默认1000）
 * @returns 历史数据记录
 */
export async function getDeviceDataHistory(
  endpointId: string,
  deviceId: string,
  dataKey: string,
  startTime: string,
  endTime: string,
  aggregation?: 'minute' | 'hour' | 'day',
  aggregateType?: 'avg' | 'max' | 'min',
  limit?: number
): Promise<DeviceDataHistoryResponse> {
  // 构建查询参数
  const params: Record<string, string | number> = {
    dataKey,
    startTime,
    endTime,
  };

  if (aggregation) {
    params.aggregation = aggregation;
  }

  if (aggregateType) {
    params.aggregateType = aggregateType;
  }

  if (limit !== undefined) {
    params.limit = limit;
  }

  // 调用历史数据查询API
  const response = await api.get<DeviceDataHistoryResponse>(
    `/visualization/endpoints/${endpointId}/devices/${deviceId}/data/history`,
    { params }
  );

  return response;
}

/**
 * 获取端点的设备列表
 *
 * @param endpointId - Endpoint ID
 * @returns 设备列表
 */
export async function getEndpointDevices(
  endpointId: string
): Promise<{ devices: Array<{ id: string; device_id: string; custom_name: string }> }> {
  const response = await api.get<{
    devices: Array<{ id: string; device_id: string; custom_name: string }>;
  }>(`/visualization/endpoints/${endpointId}/devices`);
  return response;
}

/**
 * 获取端点设备的实时在线状态（通过WebSocket连接检测）
 *
 * @param endpointId - Endpoint ID
 * @returns 设备在线状态字典（deviceId -> isOnline）
 */
export async function getDevicesOnlineStatus(
  endpointId: string
): Promise<{ onlineStatus: Record<string, boolean> }> {
  const response = await api.get<{ onlineStatus: Record<string, boolean> }>(
    `/visualization/endpoints/${endpointId}/devices/online-status`
  );
  return response;
}

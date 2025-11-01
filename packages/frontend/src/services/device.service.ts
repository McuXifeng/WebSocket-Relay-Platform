/**
 * Device Service
 * 设备管理相关的 API 服务
 * Story 3.11: 连接设备管理和自定义名称永久化
 */

import type { GetDevicesResponse } from '@websocket-relay/shared';
import { api } from './api';

/**
 * 获取端点的设备列表
 * @param endpointId - 端点 ID
 * @returns 设备列表响应
 */
export async function getEndpointDevices(endpointId: string): Promise<GetDevicesResponse> {
  // apiClient 响应拦截器已提取一层 data 字段
  // 后端返回: { data: { devices: [...] } }
  // 拦截器返回: { data: { devices: [...] } }
  // 需要再提取一次 data 字段
  const response = await api.get<{ data: GetDevicesResponse }>(`/endpoints/${endpointId}/devices`);
  return response.data;
}

/**
 * 更新设备名称
 * @param endpointId - 端点 ID
 * @param deviceId - 设备 ID
 * @param customName - 新的设备名称
 */
export function updateDeviceName(
  endpointId: string,
  deviceId: string,
  customName: string
): Promise<void> {
  return api.put(`/endpoints/${endpointId}/devices/${deviceId}`, {
    custom_name: customName,
  });
}

/**
 * 获取设备的可用数据字段列表
 * @param endpointId - 端点 ID
 * @param deviceId - 设备 ID
 * @returns 数据字段列表
 */
export interface DataKey {
  key: string;
  type: string;
  unit: string | null;
  lastSeen: Date;
}

export interface DataKeysResponse {
  dataKeys: DataKey[];
}

export async function getDeviceDataKeys(
  endpointId: string,
  deviceId: string
): Promise<DataKeysResponse> {
  const response = await api.get<DataKeysResponse>(
    `/endpoints/${endpointId}/devices/${deviceId}/data-keys`
  );
  return response;
}

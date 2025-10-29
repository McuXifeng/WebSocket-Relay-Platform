/**
 * Device 设备类型定义
 */

/**
 * 设备接口
 */
export interface Device {
  id: string;
  endpoint_id: string;
  device_id: string;
  custom_name: string;
  is_online: boolean;
  last_connected_at: string;
  created_at: string;
}

/**
 * 获取设备列表响应
 */
export interface GetDevicesResponse {
  devices: Device[];
}

/**
 * 更新设备名称请求
 */
export interface UpdateDeviceNameRequest {
  custom_name: string;
}

/**
 * WebSocket 协议消息类型 - 设备标识
 */
export interface IdentifyMessage {
  type: 'identify';
  deviceId: string;
  deviceName?: string;
}

/**
 * WebSocket 协议消息类型 - 设备已识别确认
 */
export interface IdentifiedMessage {
  type: 'identified';
  deviceId: string;
  customName: string;
}

/**
 * 设备分组类型定义
 * @module device-group.types
 */

/**
 * 设备分组基本信息
 */
export interface DeviceGroup {
  id: string;
  user_id: string;
  endpoint_id: string;
  group_name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 设备分组成员
 */
export interface DeviceGroupMember {
  id: string;
  group_id: string;
  device_id: string;
  added_at: string;
}

/**
 * 设备分组列表项（包含聚合信息）
 */
export interface DeviceGroupListItem {
  id: string;
  group_name: string;
  endpoint_id: string;
  endpoint_name: string;
  device_count: number;
  created_at: string;
}

/**
 * 设备分组详情（包含设备成员列表）
 */
export interface DeviceGroupDetail {
  id: string;
  group_name: string;
  description?: string;
  endpoint_id: string;
  endpoint_name: string;
  device_count: number;
  created_at: string;
  devices: DeviceGroupDeviceInfo[];
}

/**
 * 设备分组中的设备信息
 */
export interface DeviceGroupDeviceInfo {
  id: string;
  device_id: string;
  custom_name: string;
  last_connected_at: string;
}

/**
 * 分组数据聚合结果
 */
export interface GroupDataAggregation {
  group_id: string;
  device_count: number;
  last_update: string;
  aggregations: DataKeyAggregation[];
}

/**
 * 单个数据键的聚合统计
 */
export interface DataKeyAggregation {
  data_key: string;
  unit?: string;
  average: number;
  max: number;
  min: number;
  sample_count: number;
}

/**
 * 批量控制指令
 */
export interface BatchControlCommand {
  device_id: string;
  command_id: string;
  status: 'pending' | 'success' | 'failed' | 'timeout';
}

/**
 * 批量控制指令状态
 */
export interface BatchControlStatus {
  batch_id: string;
  total_devices: number;
  success_count: number;
  failed_count: number;
  pending_count: number;
  commands: BatchControlCommandDetail[];
}

/**
 * 批量控制指令详细状态
 */
export interface BatchControlCommandDetail {
  device_id: string;
  command_id: string;
  status: 'pending' | 'success' | 'failed' | 'timeout';
  ack_at?: string;
  error_message?: string;
}

/**
 * 创建设备分组请求
 */
export interface CreateDeviceGroupRequest {
  endpoint_id: string;
  group_name: string;
  description?: string;
  device_ids?: string[];
}

/**
 * 更新设备分组请求
 */
export interface UpdateDeviceGroupRequest {
  group_name?: string;
  description?: string;
}

/**
 * 添加设备到分组请求
 */
export interface AddDevicesToGroupRequest {
  device_ids: string[];
}

/**
 * 从分组移除设备请求
 */
export interface RemoveDevicesFromGroupRequest {
  device_ids: string[];
}

/**
 * 批量发送控制指令请求
 */
export interface SendBatchControlRequest {
  command_type: string;
  command_params: Record<string, any>;
}

/**
 * 批量导出数据请求参数
 */
export interface ExportGroupDataParams {
  start_time?: string;
  end_time?: string;
  data_keys?: string;
  format: 'csv' | 'json';
}

/**
 * 查询设备分组列表请求参数
 */
export interface GetDeviceGroupsParams {
  endpoint_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

/**
 * 查询设备分组列表响应
 */
export interface GetDeviceGroupsResponse {
  groups: DeviceGroupListItem[];
  page: number;
  page_size: number;
  total: number;
}

/**
 * 添加设备到分组响应
 */
export interface AddDevicesToGroupResponse {
  added_count: number;
  total_devices: number;
}

/**
 * 从分组移除设备响应
 */
export interface RemoveDevicesFromGroupResponse {
  removed_count: number;
  total_devices: number;
}

/**
 * 批量发送控制指令响应
 */
export interface SendBatchControlResponse {
  batch_id: string;
  total_devices: number;
  commands: BatchControlCommand[];
}

/**
 * 删除设备分组响应
 */
export interface DeleteDeviceGroupResponse {
  success: boolean;
  message: string;
}

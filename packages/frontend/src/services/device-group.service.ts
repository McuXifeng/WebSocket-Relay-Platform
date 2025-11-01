/**
 * Device Group Service
 * 设备分组管理相关的 API 服务
 * Story 6.6: 设备分组和批量管理
 */

import type {
  DeviceGroup,
  DeviceGroupDetail,
  GetDeviceGroupsParams,
  GetDeviceGroupsResponse,
  CreateDeviceGroupRequest,
  UpdateDeviceGroupRequest,
  AddDevicesToGroupRequest,
  RemoveDevicesFromGroupRequest,
  AddDevicesToGroupResponse,
  RemoveDevicesFromGroupResponse,
  DeleteDeviceGroupResponse,
  GroupDataAggregation,
  SendBatchControlRequest,
  SendBatchControlResponse,
  BatchControlStatus,
  ExportGroupDataParams,
} from '@websocket-relay/shared';
import { api } from './api';

/**
 * 创建设备分组
 * @param request - 创建设备分组请求
 * @returns 创建的设备分组信息
 */
export async function createDeviceGroup(request: CreateDeviceGroupRequest): Promise<DeviceGroup> {
  // 后端返回: { data: { id, group_name, ... } }
  // api 拦截器已提取一层 data，所以这里的 response.data 就是设备分组对象
  const response = await api.post<{ data: DeviceGroup }>('/device-groups', request);
  return response.data;
}

/**
 * 查询用户所有设备分组
 * @param params - 查询参数（endpoint_id, search, page, page_size）
 * @returns 设备分组列表响应
 */
export async function getDeviceGroups(
  params?: GetDeviceGroupsParams
): Promise<GetDeviceGroupsResponse> {
  // 后端返回: { data: { groups: [...], page, page_size, total } }
  const response = await api.get<{ data: GetDeviceGroupsResponse }>('/device-groups', { params });
  return response.data;
}

/**
 * 查询设备分组详情
 * @param groupId - 设备分组 ID
 * @returns 设备分组详情
 */
export async function getDeviceGroupById(groupId: string): Promise<DeviceGroupDetail> {
  // 后端返回: { data: { id, group_name, devices: [...], ... } }
  const response = await api.get<{ data: DeviceGroupDetail }>(`/device-groups/${groupId}`);
  return response.data;
}

/**
 * 更新设备分组信息
 * @param groupId - 设备分组 ID
 * @param request - 更新请求
 * @returns 更新后的设备分组信息
 */
export async function updateDeviceGroup(
  groupId: string,
  request: UpdateDeviceGroupRequest
): Promise<DeviceGroup> {
  // 后端返回: { data: { id, group_name, description, updated_at } }
  const response = await api.put<{ data: DeviceGroup }>(`/device-groups/${groupId}`, request);
  return response.data;
}

/**
 * 删除设备分组
 * @param groupId - 设备分组 ID
 * @returns 删除结果
 */
export async function deleteDeviceGroup(groupId: string): Promise<DeleteDeviceGroupResponse> {
  // 后端返回: { data: { success: true, message: "..." } }
  const response = await api.delete<{ data: DeleteDeviceGroupResponse }>(
    `/device-groups/${groupId}`
  );
  return response.data;
}

/**
 * 添加设备到分组
 * @param groupId - 设备分组 ID
 * @param request - 添加设备请求
 * @returns 添加结果
 */
export async function addDevicesToGroup(
  groupId: string,
  request: AddDevicesToGroupRequest
): Promise<AddDevicesToGroupResponse> {
  // 后端返回: { data: { added_count, total_devices } }
  const response = await api.post<{ data: AddDevicesToGroupResponse }>(
    `/device-groups/${groupId}/devices`,
    request
  );
  return response.data;
}

/**
 * 从分组移除设备
 * @param groupId - 设备分组 ID
 * @param request - 移除设备请求
 * @returns 移除结果
 */
export async function removeDevicesFromGroup(
  groupId: string,
  request: RemoveDevicesFromGroupRequest
): Promise<RemoveDevicesFromGroupResponse> {
  // 后端返回: { data: { removed_count, total_devices } }
  const response = await api.delete<{ data: RemoveDevicesFromGroupResponse }>(
    `/device-groups/${groupId}/devices`,
    { data: request }
  );
  return response.data;
}

/**
 * 获取分组数据聚合
 * @param groupId - 设备分组 ID
 * @returns 分组数据聚合结果
 */
export async function getGroupDataAggregation(groupId: string): Promise<GroupDataAggregation> {
  // 后端返回: { data: { group_id, device_count, aggregations: [...] } }
  const response = await api.get<{ data: GroupDataAggregation }>(`/device-groups/${groupId}/data`);
  return response.data;
}

/**
 * 批量发送控制指令
 * @param groupId - 设备分组 ID
 * @param request - 批量控制请求
 * @returns 批量控制响应
 */
export async function sendBatchControlCommand(
  groupId: string,
  request: SendBatchControlRequest
): Promise<SendBatchControlResponse> {
  // 后端返回: { data: { batch_id, total_devices, commands: [...] } }
  const response = await api.post<{ data: SendBatchControlResponse }>(
    `/device-groups/${groupId}/control`,
    request
  );
  return response.data;
}

/**
 * 查询批量控制指令状态
 * @param groupId - 设备分组 ID
 * @param batchId - 批量指令 ID
 * @returns 批量控制状态
 */
export async function getBatchControlStatus(
  groupId: string,
  batchId: string
): Promise<BatchControlStatus> {
  // 后端返回: { data: { batch_id, total_devices, success_count, ..., commands: [...] } }
  const response = await api.get<{ data: BatchControlStatus }>(
    `/device-groups/${groupId}/control/${batchId}`
  );
  return response.data;
}

/**
 * 批量导出设备数据
 * @param groupId - 设备分组 ID
 * @param params - 导出参数（start_time, end_time, data_keys, format）
 * @returns 下载的文件数据（Blob）
 */
export async function exportGroupDeviceData(
  groupId: string,
  params: ExportGroupDataParams
): Promise<Blob> {
  // 后端返回 CSV 或 JSON 文件流
  // api 拦截器已提取 response.data，直接返回 Blob
  const blob = await api.get<Blob>(`/device-groups/${groupId}/export`, {
    params,
    responseType: 'blob', // 接收二进制数据
  });
  return blob;
}

/**
 * 触发浏览器下载文件
 * @param blob - 文件数据
 * @param filename - 文件名
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

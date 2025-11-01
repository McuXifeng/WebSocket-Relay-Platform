import { api } from './api';

/**
 * 控制指令响应
 */
export interface SendControlCommandResponse {
  commandId: string;
  status: 'pending';
  sentAt: string;
  message: string;
}

/**
 * 控制指令记录
 */
export interface ControlCommand {
  commandId: string;
  commandType: string;
  commandParams: Record<string, unknown>;
  status: 'pending' | 'success' | 'failed' | 'timeout';
  sentAt: string;
  ackAt: string | null;
  timeoutAt: string | null;
  errorMessage: string | null;
  duration: number | null; // 响应耗时（毫秒）
}

/**
 * 控制指令历史响应
 */
export interface ControlCommandHistoryResponse {
  deviceId: string;
  deviceName: string;
  commands: ControlCommand[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/**
 * 控制指令详情响应
 */
export interface ControlCommandDetailResponse {
  commandId: string;
  deviceId: string;
  deviceName: string;
  commandType: string;
  commandParams: Record<string, unknown>;
  status: 'pending' | 'success' | 'failed' | 'timeout';
  sentAt: string;
  ackAt: string | null;
  timeoutAt: string | null;
  errorMessage: string | null;
  duration: number | null;
}

/**
 * 发送控制指令
 *
 * @param endpointId - Endpoint ID（数据库UUID）
 * @param deviceId - Device ID（数据库UUID）
 * @param command - 指令类型（如 "setLight", "setTemperature"）
 * @param params - 指令参数（JSON对象）
 * @returns 控制指令响应
 */
export async function sendControlCommand(
  endpointId: string,
  deviceId: string,
  command: string,
  params: Record<string, unknown>
): Promise<SendControlCommandResponse> {
  const response = await api.post<SendControlCommandResponse>(
    `/endpoints/${endpointId}/devices/${deviceId}/control`,
    { command, params }
  );
  return response;
}

/**
 * 获取控制指令历史
 *
 * @param endpointId - Endpoint ID
 * @param deviceId - Device ID
 * @param page - 页码（可选，默认1）
 * @param pageSize - 每页条数（可选，默认20）
 * @param status - 状态筛选（可选：pending, success, failed, timeout）
 * @returns 控制指令历史列表
 */
export async function getControlCommandHistory(
  endpointId: string,
  deviceId: string,
  page?: number,
  pageSize?: number,
  status?: 'pending' | 'success' | 'failed' | 'timeout'
): Promise<ControlCommandHistoryResponse> {
  const params: Record<string, string | number> = {};

  if (page !== undefined) {
    params.page = page;
  }

  if (pageSize !== undefined) {
    params.pageSize = pageSize;
  }

  if (status) {
    params.status = status;
  }

  const response = await api.get<ControlCommandHistoryResponse>(
    `/endpoints/${endpointId}/devices/${deviceId}/control/history`,
    { params }
  );
  return response;
}

/**
 * 获取控制指令详情
 *
 * @param endpointId - Endpoint ID
 * @param deviceId - Device ID
 * @param commandId - 指令唯一标识
 * @returns 控制指令详情
 */
export async function getControlCommandDetail(
  endpointId: string,
  deviceId: string,
  commandId: string
): Promise<ControlCommandDetailResponse> {
  const response = await api.get<ControlCommandDetailResponse>(
    `/endpoints/${endpointId}/devices/${deviceId}/control/${commandId}`
  );
  return response;
}

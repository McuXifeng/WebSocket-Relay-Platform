import { useEffect, useRef } from 'react';
import { notification } from 'antd';
import config from '../config/env';
import type { AlertNotificationMessage } from '@websocket-relay/shared';

/**
 * useAlertNotifications Hook
 *
 * 职责：管理告警通知的WebSocket连接和通知显示
 *
 * 功能：
 * - 建立WebSocket连接到后端
 * - 监听告警通知消息
 * - 使用Ant Design notification显示告警
 * - 根据告警级别显示不同样式的通知
 * - 可选：播放告警声音（critical级别）
 */
export function useAlertNotifications() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 获取JWT token
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No authentication token found, skipping WebSocket connection');
      return;
    }

    // 建立WebSocket连接
    const connectWebSocket = () => {
      try {
        // 将 HTTP(S) URL 转换为 WS(S) URL
        const wsUrl = config.API_BASE_URL.replace(/^http/, 'ws').replace(/\/api$/, '');
        const ws = new WebSocket(`${wsUrl}/ws?token=${token}`);

        ws.onopen = () => {
          console.log('WebSocket连接已建立（告警通知）');
          wsRef.current = ws;
        };

        ws.onmessage = (event) => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const message = JSON.parse(event.data as string);

            // 检查是否为告警通知消息
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (message.type === 'alert') {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              handleAlertNotification(message as AlertNotificationMessage);
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('WebSocket连接已关闭，将在5秒后重连');
          wsRef.current = null;

          // 5秒后自动重连
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 5000);
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
      }
    };

    // 处理告警通知消息
    const handleAlertNotification = (alertMessage: AlertNotificationMessage) => {
      const { ruleName, deviceName, dataKey, triggeredValue, threshold, alertLevel, operator } =
        alertMessage;

      // 根据告警级别选择通知类型和配置
      const notificationConfig = {
        info: {
          type: 'info' as const,
          duration: 4.5,
        },
        warning: {
          type: 'warning' as const,
          duration: 6,
        },
        critical: {
          type: 'error' as const,
          duration: 0, // 不自动关闭
        },
      };

      const config = notificationConfig[alertLevel] || notificationConfig.info;

      // 显示通知
      notification[config.type]({
        message: `告警：${ruleName}`,
        description: `设备：${deviceName}\n触发条件：${dataKey} ${operator} ${threshold}\n当前值：${triggeredValue}`,
        duration: config.duration,
        placement: 'topRight',
      });

      // 可选：为 critical 级别播放告警声音
      if (alertLevel === 'critical') {
        try {
          // 这里可以添加声音播放逻辑
          // const audio = new Audio('/alert-sound.mp3');
          // void audio.play();
        } catch (error) {
          console.error('Failed to play alert sound:', error);
        }
      }
    };

    // 初始化WebSocket连接
    connectWebSocket();

    // 清理函数
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []);

  return null; // 这个hook只处理副作用，不返回任何值
}

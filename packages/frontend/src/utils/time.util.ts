/**
 * Time Utility Functions
 *
 * 职责:提供移动端和PC端的时间格式化函数
 */

import { formatDistanceToNow, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 移动端时间格式化
 * 7 天内:相对时间(如"5 分钟前")
 * 7 天外:绝对时间(如"2025-10-28 14:30")
 */
export function formatTimeForMobile(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInDays = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24);

  if (diffInDays < 7) {
    // 7 天内显示相对时间
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: zhCN });
  } else {
    // 7 天外显示绝对时间
    return format(dateObj, 'yyyy-MM-dd HH:mm', { locale: zhCN });
  }
}

/**
 * PC 端时间格式化(保持原有格式)
 */
export function formatTimeForDesktop(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
}

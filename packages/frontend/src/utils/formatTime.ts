import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 格式化相对时间
 *
 * @param date - 时间字符串或 null
 * @returns 格式化后的相对时间（如"2 分钟前"）
 */
export function formatRelativeTime(date: string | null): string {
  if (!date) {
    return '从未活跃';
  }

  try {
    const parsedDate = new Date(date);
    return formatDistanceToNow(parsedDate, {
      addSuffix: true, // 添加"前"后缀
      locale: zhCN, // 使用中文本地化
    });
  } catch {
    return '时间格式错误';
  }
}

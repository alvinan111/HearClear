/**
 * 计算两个时间戳之间的天数差
 */
export function daysBetween(from: Date | string, to: Date | string = new Date()): number {
  const fromDate = typeof from === 'string' ? new Date(from) : from;
  const toDate = typeof to === 'string' ? new Date(to) : to;
  const ms = toDate.getTime() - fromDate.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * 判断订阅是否已过期
 */
export function isSubscriptionExpired(expiresAt: string | null): boolean {
  if (expiresAt === null) return false; // null = 永不过期
  return new Date(expiresAt) < new Date();
}

/**
 * 格式化剩余时间显示（中文/英文）
 */
export function formatRemainingDays(
  expiresAt: string | null,
  locale: 'zh' | 'en' = 'zh'
): string {
  if (expiresAt === null) {
    return locale === 'zh' ? '永久有效' : 'Lifetime';
  }
  const days = daysBetween(new Date(), new Date(expiresAt));
  if (days <= 0) {
    return locale === 'zh' ? '已过期' : 'Expired';
  }
  if (days === 1) {
    return locale === 'zh' ? '剩余 1 天' : '1 day left';
  }
  return locale === 'zh' ? `剩余 ${days} 天` : `${days} days left`;
}

/**
 * 格式化日期显示
 */
export function formatDate(
  date: string | Date,
  locale: 'zh' | 'en' = 'zh'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (locale === 'zh') {
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

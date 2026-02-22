import { daysBetween, isSubscriptionExpired, formatRemainingDays, formatDate } from '@utils/date';

describe('daysBetween', () => {
  it('同一天返回 0', () => {
    const now = new Date();
    expect(daysBetween(now, now)).toBe(0);
  });

  it('1 天前到现在返回 1', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(daysBetween(yesterday)).toBe(1);
  });

  it('3 天差值', () => {
    const from = new Date('2024-01-01T00:00:00Z');
    const to   = new Date('2024-01-04T00:00:00Z');
    expect(daysBetween(from, to)).toBe(3);
  });

  it('支持字符串格式', () => {
    expect(daysBetween('2024-01-01', '2024-01-08')).toBe(7);
  });

  it('反向差值返回负数', () => {
    expect(daysBetween('2024-01-10', '2024-01-01')).toBe(-9);
  });
});

describe('isSubscriptionExpired', () => {
  it('null 表示永不过期，返回 false', () => {
    expect(isSubscriptionExpired(null)).toBe(false);
  });

  it('未来时间返回 false（未过期）', () => {
    const future = new Date(Date.now() + 86400_000).toISOString();
    expect(isSubscriptionExpired(future)).toBe(false);
  });

  it('过去时间返回 true（已过期）', () => {
    const past = new Date(Date.now() - 86400_000).toISOString();
    expect(isSubscriptionExpired(past)).toBe(true);
  });
});

describe('formatRemainingDays', () => {
  it('null → 永久有效（中文）', () => {
    expect(formatRemainingDays(null, 'zh')).toBe('永久有效');
  });

  it('null → Lifetime（英文）', () => {
    expect(formatRemainingDays(null, 'en')).toBe('Lifetime');
  });

  it('已过期中文', () => {
    const past = new Date(Date.now() - 86400_000).toISOString();
    expect(formatRemainingDays(past, 'zh')).toBe('已过期');
  });

  it('已过期英文', () => {
    const past = new Date(Date.now() - 86400_000).toISOString();
    expect(formatRemainingDays(past, 'en')).toBe('Expired');
  });

  it('剩余 1 天中文', () => {
    // 1.5 天后过期 → floor(1.5) = 1
    const inOneAndHalfDays = new Date(Date.now() + 1.5 * 86400_000).toISOString();
    expect(formatRemainingDays(inOneAndHalfDays, 'zh')).toBe('剩余 1 天');
  });

  it('剩余 1 天英文', () => {
    const inOneAndHalfDays = new Date(Date.now() + 1.5 * 86400_000).toISOString();
    expect(formatRemainingDays(inOneAndHalfDays, 'en')).toBe('1 day left');
  });

  it('剩余多天中文', () => {
    const future = new Date(Date.now() + 10 * 86400_000).toISOString();
    const result = formatRemainingDays(future, 'zh');
    expect(result).toMatch(/剩余 \d+ 天/);
  });

  it('剩余多天英文', () => {
    const future = new Date(Date.now() + 10 * 86400_000).toISOString();
    const result = formatRemainingDays(future, 'en');
    expect(result).toMatch(/\d+ days left/);
  });
});

describe('formatDate', () => {
  it('中文格式化', () => {
    expect(formatDate('2024-03-15', 'zh')).toBe('2024年3月15日');
  });

  it('英文格式化', () => {
    const result = formatDate('2024-03-15', 'en');
    expect(result).toMatch(/March/);
    expect(result).toMatch(/2024/);
  });

  it('支持 Date 对象输入', () => {
    const d = new Date('2024-06-01T00:00:00Z');
    const result = formatDate(d, 'zh');
    expect(result).toContain('2024年');
  });
});

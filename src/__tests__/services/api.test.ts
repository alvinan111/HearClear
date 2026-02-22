/**
 * api.ts 服务层测试
 */
import * as apiService from '@services/api';

jest.mock('@services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from '@services/supabase';
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

function makeChain(data: unknown, error: unknown = null) {
  const chain: Record<string, jest.Mock> = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
    insert: jest.fn().mockResolvedValue({ error }),
  };
  // 使每个方法都返回 chain 自身
  Object.keys(chain).forEach(k => {
    if (k !== 'single' && k !== 'insert') {
      chain[k].mockReturnThis();
    }
  });
  (mockSupabase.from as jest.Mock).mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchAppConfig', () => {
  it('成功解析配置项', async () => {
    const rows = [
      { key: 'default_paywall_enabled', value: true },
      { key: 'default_trial_days', value: 3 },
      { key: 'prices', value: { daily: 100, monthly: 1800, yearly: 12800, lifetime: 29800 } },
      { key: 'recommended_plan', value: 'yearly' },
      { key: 'announcement', value: null },
      { key: 'ads_enabled', value: false },
      { key: 'splash_ad_enabled', value: false },
      { key: 'banner_ad_enabled', value: false },
      { key: 'splash_ad_id', value: { ios: '', android: '' } },
      { key: 'banner_ad_id', value: { ios: '', android: '' } },
      { key: 'splash_ad_duration', value: 5 },
    ];
    const chain = {
      select: jest.fn().mockResolvedValue({ data: rows, error: null }),
    };
    (mockSupabase.from as jest.Mock).mockReturnValue(chain);

    const config = await apiService.fetchAppConfig();
    expect(config).not.toBeNull();
    expect(config?.defaultTrialDays).toBe(3);
    expect(config?.prices.yearly).toBe(12800);
    expect(config?.recommendedPlan).toBe('yearly');
    expect(config?.adsEnabled).toBe(false);
  });

  it('数据库报错时返回 null', async () => {
    const chain = {
      select: jest.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
    };
    (mockSupabase.from as jest.Mock).mockReturnValue(chain);
    const config = await apiService.fetchAppConfig();
    expect(config).toBeNull();
  });
});

describe('fetchAppVersion', () => {
  const versionRow = {
    platform: 'ios',
    latest_version: '2.0.0',
    min_version: '1.5.0',
    update_url: 'https://apps.apple.com/xxx',
    release_notes: '修复了若干问题',
  };

  it('成功返回版本信息', async () => {
    makeChain(versionRow);
    const version = await apiService.fetchAppVersion('ios');
    expect(version?.latestVersion).toBe('2.0.0');
    expect(version?.minVersion).toBe('1.5.0');
    expect(version?.platform).toBe('ios');
  });

  it('无版本记录时返回 null', async () => {
    makeChain(null, { message: 'no rows' });
    const version = await apiService.fetchAppVersion('android');
    expect(version).toBeNull();
  });
});

describe('fetchActiveSubscription', () => {
  const subRow = {
    id: 'sub-001',
    user_id: 'user-001',
    type: 'yearly',
    status: 'active',
    started_at: '2024-01-01T00:00:00Z',
    expires_at: '2025-01-01T00:00:00Z',
    granted_by: null,
  };

  it('成功返回有效订阅', async () => {
    makeChain(subRow);
    const sub = await apiService.fetchActiveSubscription('user-001');
    expect(sub?.type).toBe('yearly');
    expect(sub?.status).toBe('active');
    expect(sub?.userId).toBe('user-001');
  });

  it('无订阅时返回 null', async () => {
    makeChain(null, { message: 'no rows' });
    const sub = await apiService.fetchActiveSubscription('user-001');
    expect(sub).toBeNull();
  });

  it('lifetime 订阅 expiresAt 为 null', async () => {
    makeChain({ ...subRow, type: 'lifetime', expires_at: null });
    const sub = await apiService.fetchActiveSubscription('user-001');
    expect(sub?.expiresAt).toBeNull();
  });
});

describe('submitFeedback', () => {
  it('提交成功返回 error=null', async () => {
    const chain = { insert: jest.fn().mockResolvedValue({ error: null }) };
    (mockSupabase.from as jest.Mock).mockReturnValue(chain);

    const result = await apiService.submitFeedback({
      userId: 'user-001',
      type: 'bug',
      content: '发现了一个 bug',
    });
    expect(result.error).toBeNull();
  });

  it('数据库报错时返回错误信息', async () => {
    const chain = { insert: jest.fn().mockResolvedValue({ error: { message: '插入失败' } }) };
    (mockSupabase.from as jest.Mock).mockReturnValue(chain);

    const result = await apiService.submitFeedback({
      userId: null,
      type: 'other',
      content: '匿名反馈',
    });
    expect(result.error).toBe('插入失败');
  });

  it('带联系方式提交', async () => {
    const chain = { insert: jest.fn().mockResolvedValue({ error: null }) };
    (mockSupabase.from as jest.Mock).mockReturnValue(chain);

    await apiService.submitFeedback({
      userId: 'user-001',
      type: 'feature',
      content: '希望增加语音识别功能',
      contactInfo: 'test@example.com',
    });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ contact_info: 'test@example.com' })
    );
  });
});

describe('trackAdEvent', () => {
  it('成功记录广告展示', async () => {
    const chain = { insert: jest.fn().mockResolvedValue({ error: null }) };
    (mockSupabase.from as jest.Mock).mockReturnValue(chain);

    await apiService.trackAdEvent({
      userId: 'user-001',
      adType: 'banner',
      adId: 'banner-001',
      event: 'impression',
      platform: 'ios',
    });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        ad_type: 'banner',
        event: 'impression',
        platform: 'ios',
      })
    );
  });

  it('匿名用户 userId=null 不报错', async () => {
    const chain = { insert: jest.fn().mockResolvedValue({ error: null }) };
    (mockSupabase.from as jest.Mock).mockReturnValue(chain);

    await expect(apiService.trackAdEvent({
      userId: null,
      adType: 'splash',
      adId: 'splash-001',
      event: 'skip',
      platform: 'android',
    })).resolves.not.toThrow();
  });
});

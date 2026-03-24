// Mock supabase 防止初始化时因缺少 URL 报错
jest.mock('@services/supabase', () => ({
  supabase: { auth: {}, from: jest.fn() },
}));
jest.mock('@services/api');
jest.mock('@utils/storage');

import { useSubscriptionStore } from '@stores/subscription-store';
import * as api from '@services/api';
import * as storage from '@utils/storage';
import type { UserProfile } from '@/types/auth';
import type { Subscription } from '@/types/subscription';
import { TRIAL_DEFAULTS } from '@constants/trial';

const mockApi = api as jest.Mocked<typeof api>;
const mockStorage = storage as jest.Mocked<typeof storage>;

const now = new Date();
const threeDaysAgo = new Date(now.getTime() - 3 * 86400_000).toISOString();
const future = new Date(now.getTime() + 30 * 86400_000).toISOString();
const past   = new Date(now.getTime() - 1 * 86400_000).toISOString();

const makeProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'user-001',
  phone: '+8613800000001',
  email: null,
  nickname: null,
  avatarUrl: null,
  firstUseAt: threeDaysAgo,
  totalUsageMinutes: 0,
  paywallEnabled: true,
  trialDaysOverride: null,
  isBanned: false,
  createdAt: threeDaysAgo,
  ...overrides,
});

const makeSubscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: 'sub-001',
  userId: 'user-001',
  type: 'monthly',
  status: 'active',
  startedAt: threeDaysAgo,
  expiresAt: future,
  grantedBy: null,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.setItem.mockResolvedValue(undefined);
  mockStorage.getItem.mockResolvedValue(null);
  useSubscriptionStore.setState({
    subscription: null,
    isPaid: false,
    isUnlimited: false,
    isInTrial: true,
    trialDaysRemaining: TRIAL_DEFAULTS.TRIAL_DAYS,
    showPaywall: false,
    isLoading: false,
  });
});

describe('syncSubscription - 有效订阅', () => {
  it('有效 monthly 订阅：isPaid=true, showPaywall=false', async () => {
    mockApi.fetchActiveSubscription.mockResolvedValue(makeSubscription());
    await useSubscriptionStore.getState().syncSubscription('user-001', makeProfile(), 3);
    const state = useSubscriptionStore.getState();
    expect(state.isPaid).toBe(true);
    expect(state.showPaywall).toBe(false);
    expect(state.isInTrial).toBe(false);
  });

  it('unlimited 订阅：isUnlimited=true', async () => {
    mockApi.fetchActiveSubscription.mockResolvedValue(makeSubscription({ type: 'unlimited' }));
    await useSubscriptionStore.getState().syncSubscription('user-001', makeProfile(), 3);
    expect(useSubscriptionStore.getState().isUnlimited).toBe(true);
  });

  it('lifetime 订阅（expiresAt=null）：不过期', async () => {
    mockApi.fetchActiveSubscription.mockResolvedValue(makeSubscription({ type: 'lifetime', expiresAt: null }));
    await useSubscriptionStore.getState().syncSubscription('user-001', makeProfile(), 3);
    expect(useSubscriptionStore.getState().isPaid).toBe(true);
  });

  it('已过期订阅：isPaid=false', async () => {
    mockApi.fetchActiveSubscription.mockResolvedValue(makeSubscription({ expiresAt: past }));
    await useSubscriptionStore.getState().syncSubscription('user-001', makeProfile(), 3);
    expect(useSubscriptionStore.getState().isPaid).toBe(false);
  });
});

describe('syncSubscription - 试用期逻辑', () => {
  it('注册 1 天，试用 3 天 → 在试用期', async () => {
    mockApi.fetchActiveSubscription.mockResolvedValue(null);
    const oneDayAgo = new Date(now.getTime() - 1 * 86400_000).toISOString();
    const profile = makeProfile({ firstUseAt: oneDayAgo, paywallEnabled: true });
    await useSubscriptionStore.getState().syncSubscription('user-001', profile, 3);
    const state = useSubscriptionStore.getState();
    expect(state.isInTrial).toBe(true);
    expect(state.showPaywall).toBe(false);
  });

  it('注册 5 天，试用 3 天 → 不在试用期，显示付费墙', async () => {
    mockApi.fetchActiveSubscription.mockResolvedValue(null);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 86400_000).toISOString();
    const profile = makeProfile({ firstUseAt: fiveDaysAgo, paywallEnabled: true });
    await useSubscriptionStore.getState().syncSubscription('user-001', profile, 3);
    const state = useSubscriptionStore.getState();
    expect(state.isInTrial).toBe(false);
    expect(state.showPaywall).toBe(true);
  });

  it('管理员覆盖试用天数（trialDaysOverride=7）', async () => {
    mockApi.fetchActiveSubscription.mockResolvedValue(null);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 86400_000).toISOString();
    const profile = makeProfile({ firstUseAt: fiveDaysAgo, trialDaysOverride: 7, paywallEnabled: true });
    await useSubscriptionStore.getState().syncSubscription('user-001', profile, 3);
    expect(useSubscriptionStore.getState().isInTrial).toBe(true);
  });

  it('paywallEnabled=false → 即使过期也不显示付费墙', async () => {
    mockApi.fetchActiveSubscription.mockResolvedValue(null);
    const tenDaysAgo = new Date(now.getTime() - 10 * 86400_000).toISOString();
    const profile = makeProfile({ firstUseAt: tenDaysAgo, paywallEnabled: false });
    await useSubscriptionStore.getState().syncSubscription('user-001', profile, 3);
    expect(useSubscriptionStore.getState().showPaywall).toBe(false);
  });
});

describe('syncSubscription - 错误处理', () => {
  it('API 报错时不崩溃，isLoading 恢复 false', async () => {
    mockApi.fetchActiveSubscription.mockRejectedValue(new Error('timeout'));
    await expect(
      useSubscriptionStore.getState().syncSubscription('user-001', makeProfile(), 3)
    ).resolves.not.toThrow();
    expect(useSubscriptionStore.getState().isLoading).toBe(false);
  });
});

describe('loadFromCache', () => {
  it('有缓存 profile 且在试用期', async () => {
    const profile = makeProfile({ firstUseAt: new Date(now.getTime() - 1 * 86400_000).toISOString() });
    await useSubscriptionStore.getState().loadFromCache(profile, 3);
    expect(useSubscriptionStore.getState().isInTrial).toBe(true);
  });

  it('profile 为 null 时从 storage 读取', async () => {
    mockStorage.getItem.mockResolvedValue(makeProfile());
    await useSubscriptionStore.getState().loadFromCache(null, 3);
    expect(mockStorage.getItem).toHaveBeenCalled();
  });

  it('无 profile 无缓存：不崩溃', async () => {
    mockStorage.getItem.mockResolvedValue(null);
    await expect(
      useSubscriptionStore.getState().loadFromCache(null, 3)
    ).resolves.not.toThrow();
  });
});

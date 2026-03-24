/**
 * config-store 测试
 *
 * 覆盖：
 *   1. 初始状态验证
 *   2. setOfflineMode
 *   3. getEffectiveConfig（在线/离线/无缓存三种情况）
 *   4. syncConfig 成功路径
 *   5. syncConfig 失败路径（降级到缓存）
 *   6. loadFromCache
 */

jest.mock('@services/supabase', () => ({
  supabase: { auth: {}, from: jest.fn() },
}));
jest.mock('@services/api');
jest.mock('@utils/storage');

import { useConfigStore } from '@stores/config-store';
import * as api from '@services/api';
import * as storage from '@utils/storage';
import type { AppConfig } from '@/types/config';
import { DEFAULT_APP_CONFIG } from '@/types/config';

const mockApi = api as jest.Mocked<typeof api>;
const mockStorage = storage as jest.Mocked<typeof storage>;

const mockConfig: AppConfig = {
  defaultPaywallEnabled: true,
  defaultTrialDays: 7,
  prices: { daily: 100, monthly: 1800, yearly: 12800, lifetime: 29800 },
  recommendedPlan: 'yearly',
  announcement: null,
  adsEnabled: false,
  splashAdEnabled: false,
  bannerAdEnabled: false,
  splashAdId: { ios: '', android: '' },
  bannerAdId: { ios: '', android: '' },
  splashAdDuration: 5,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.setItem.mockResolvedValue(undefined);
  mockStorage.getItem.mockResolvedValue(null);
  useConfigStore.setState({
    config: null,
    versions: null,
    lastSyncAt: null,
    isOfflineMode: false,
    isLoading: false,
  });
});

describe('初始状态', () => {
  it('config 为 null', () => {
    expect(useConfigStore.getState().config).toBeNull();
  });

  it('isOfflineMode 为 false', () => {
    expect(useConfigStore.getState().isOfflineMode).toBe(false);
  });

  it('isLoading 为 false', () => {
    expect(useConfigStore.getState().isLoading).toBe(false);
  });
});

describe('setOfflineMode', () => {
  it('切换到离线模式', () => {
    useConfigStore.getState().setOfflineMode(true);
    expect(useConfigStore.getState().isOfflineMode).toBe(true);
  });

  it('切换回在线模式', () => {
    useConfigStore.getState().setOfflineMode(true);
    useConfigStore.getState().setOfflineMode(false);
    expect(useConfigStore.getState().isOfflineMode).toBe(false);
  });
});

describe('getEffectiveConfig', () => {
  it('无配置时返回默认值', () => {
    const cfg = useConfigStore.getState().getEffectiveConfig();
    expect(cfg).toEqual(DEFAULT_APP_CONFIG);
  });

  it('有配置时返回实际配置', () => {
    useConfigStore.setState({ config: mockConfig });
    const cfg = useConfigStore.getState().getEffectiveConfig();
    expect(cfg.defaultTrialDays).toBe(7);
    expect(cfg.recommendedPlan).toBe('yearly');
  });

  it('默认配置的 defaultTrialDays 合理（>= 1）', () => {
    const cfg = useConfigStore.getState().getEffectiveConfig();
    expect(cfg.defaultTrialDays).toBeGreaterThanOrEqual(1);
  });
});

describe('syncConfig - 成功路径', () => {
  it('成功同步后 isOfflineMode=false, config 更新', async () => {
    mockApi.fetchAppConfig.mockResolvedValue(mockConfig);
    mockApi.fetchAppVersion.mockResolvedValue(null);

    const ok = await useConfigStore.getState().syncConfig();
    expect(ok).toBe(true);
    expect(useConfigStore.getState().isOfflineMode).toBe(false);
    expect(useConfigStore.getState().config?.defaultTrialDays).toBe(7);
  });

  it('同步成功后调用 setItem 缓存配置', async () => {
    mockApi.fetchAppConfig.mockResolvedValue(mockConfig);
    mockApi.fetchAppVersion.mockResolvedValue(null);

    await useConfigStore.getState().syncConfig();
    expect(mockStorage.setItem).toHaveBeenCalled();
  });

  it('isLoading 在完成后恢复 false', async () => {
    mockApi.fetchAppConfig.mockResolvedValue(mockConfig);
    mockApi.fetchAppVersion.mockResolvedValue(null);

    await useConfigStore.getState().syncConfig();
    expect(useConfigStore.getState().isLoading).toBe(false);
  });
});

describe('syncConfig - 失败路径', () => {
  it('API 报错时返回 false 且 isOfflineMode=true', async () => {
    mockApi.fetchAppConfig.mockRejectedValue(new Error('network timeout'));
    mockApi.fetchAppVersion.mockRejectedValue(new Error('network timeout'));

    const ok = await useConfigStore.getState().syncConfig();
    expect(ok).toBe(false);
    expect(useConfigStore.getState().isOfflineMode).toBe(true);
  });

  it('API 返回 null 时也降级到离线', async () => {
    mockApi.fetchAppConfig.mockResolvedValue(null);
    mockApi.fetchAppVersion.mockResolvedValue(null);

    const ok = await useConfigStore.getState().syncConfig();
    expect(ok).toBe(false);
    expect(useConfigStore.getState().isOfflineMode).toBe(true);
  });

  it('失败后 isLoading 恢复 false', async () => {
    mockApi.fetchAppConfig.mockRejectedValue(new Error('fail'));
    mockApi.fetchAppVersion.mockRejectedValue(new Error('fail'));

    await useConfigStore.getState().syncConfig();
    expect(useConfigStore.getState().isLoading).toBe(false);
  });

  it('有缓存时失败路径读取缓存', async () => {
    mockStorage.getItem.mockResolvedValueOnce(mockConfig);
    mockApi.fetchAppConfig.mockRejectedValue(new Error('fail'));
    mockApi.fetchAppVersion.mockRejectedValue(new Error('fail'));

    await useConfigStore.getState().syncConfig();
    expect(useConfigStore.getState().config?.defaultTrialDays).toBe(7);
  });
});

describe('loadFromCache', () => {
  it('有缓存时加载配置', async () => {
    mockStorage.getItem.mockResolvedValueOnce(mockConfig);
    await useConfigStore.getState().loadFromCache();
    expect(useConfigStore.getState().config?.defaultTrialDays).toBe(7);
  });

  it('无缓存时 config 保持 null', async () => {
    mockStorage.getItem.mockResolvedValue(null);
    await useConfigStore.getState().loadFromCache();
    expect(useConfigStore.getState().config).toBeNull();
  });
});

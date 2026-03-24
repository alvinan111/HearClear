/**
 * remote-config 初始化行为测试
 */

type MockAppVersion = {
  platform: 'ios' | 'android';
  latestVersion: string;
  minVersion: string;
  updateUrl: string;
  releaseNotes: string | null;
};

const mockFetch = jest.fn();
const mockAddEventListener = jest.fn();
const mockFetchAppVersion = jest.fn();
const mockSyncSubscription = jest.fn();
const mockLoadSubscriptionFromCache = jest.fn();
const mockSetConfigLocked = jest.fn();
const mockSyncConfig = jest.fn();
const mockGetEffectiveConfig = jest.fn();
const mockLoadConfigFromCache = jest.fn();

let configState: {
  versions: MockAppVersion | null;
  isOfflineMode: boolean;
};

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: (...args: unknown[]) => mockFetch(...args),
    addEventListener: (...args: unknown[]) => mockAddEventListener(...args),
  },
}));

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
}));

jest.mock('@services/api', () => ({
  fetchAppVersion: (...args: unknown[]) => mockFetchAppVersion(...args),
}));

jest.mock('@stores/config-store', () => ({
  useConfigStore: {
    getState: () => ({
      config: null,
      versions: configState.versions,
      isOfflineMode: configState.isOfflineMode,
      syncConfig: mockSyncConfig,
      getEffectiveConfig: mockGetEffectiveConfig,
      loadFromCache: mockLoadConfigFromCache,
    }),
  },
}));

jest.mock('@stores/subscription-store', () => ({
  useSubscriptionStore: {
    getState: () => ({
      isPaid: true,
      syncSubscription: mockSyncSubscription,
      loadFromCache: mockLoadSubscriptionFromCache,
    }),
  },
}));

jest.mock('@stores/audio-store', () => ({
  useAudioStore: {
    getState: () => ({
      setConfigLocked: mockSetConfigLocked,
    }),
  },
}));

jest.mock('@stores/auth-store', () => ({
  useAuthStore: {
    getState: () => ({
      user: {
        id: 'user-1',
      },
    }),
  },
}));

describe('initRemoteConfig', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    configState = {
      versions: {
        platform: 'ios',
        latestVersion: '1.1.0',
        minVersion: '1.0.0',
        updateUrl: 'https://example.com/update',
        releaseNotes: null,
      },
      isOfflineMode: false,
    };

    mockFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
    mockAddEventListener.mockReturnValue(jest.fn());
    mockSyncConfig.mockResolvedValue(true);
    mockGetEffectiveConfig.mockReturnValue({ defaultTrialDays: 7 });
    mockLoadConfigFromCache.mockResolvedValue(undefined);
    mockSyncSubscription.mockResolvedValue(undefined);
    mockLoadSubscriptionFromCache.mockResolvedValue(undefined);
    mockSetConfigLocked.mockImplementation(() => {});
    mockFetchAppVersion.mockResolvedValue(configState.versions);
  });

  it('reuses the version fetched during syncConfig instead of fetching it again', async () => {
    const { initRemoteConfig, cleanupRemoteConfig } = require('@services/remote-config') as typeof import('@services/remote-config');

    const result = await initRemoteConfig();

    expect(mockFetchAppVersion).not.toHaveBeenCalled();
    expect(mockSyncConfig).toHaveBeenCalledTimes(1);
    expect(mockSyncSubscription).toHaveBeenCalledWith('user-1', { id: 'user-1' }, 7);
    expect(result).toEqual({
      needsForceUpdate: false,
      suggestUpdate: true,
      updateUrl: 'https://example.com/update',
    });

    cleanupRemoteConfig();
  });
});

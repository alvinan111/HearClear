import { create } from 'zustand';
import { Platform } from 'react-native';
import type { RemoteConfigState, AppConfig, AppVersion } from '@types/config';
import { DEFAULT_APP_CONFIG } from '@types/config';
import { fetchAppConfig, fetchAppVersion } from '@services/api';
import { getItem, setItem } from '@utils/storage';
import { STORAGE_KEYS } from '@constants/trial';

interface ConfigStore extends RemoteConfigState {
  /** 同步远程配置（返回是否成功） */
  syncConfig: () => Promise<boolean>;
  /** 设置离线模式 */
  setOfflineMode: (offline: boolean) => void;
  /** 获取有效的 AppConfig（在线用最新，离线用缓存，无缓存用默认值） */
  getEffectiveConfig: () => AppConfig;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  config: null,
  versions: null,
  lastSyncAt: null,
  isOfflineMode: false,
  isLoading: false,

  syncConfig: async () => {
    set({ isLoading: true });
    try {
      const platform = Platform.OS as 'ios' | 'android';
      const [config, versions] = await Promise.all([
        fetchAppConfig(),
        fetchAppVersion(platform),
      ]);

      if (config) {
        const now = new Date().toISOString();
        await setItem(STORAGE_KEYS.APP_CONFIG, config);
        await setItem(STORAGE_KEYS.APP_VERSIONS, versions);
        await setItem(STORAGE_KEYS.LAST_SYNC_AT, now);
        set({
          config,
          versions,
          lastSyncAt: now,
          isOfflineMode: false,
          isLoading: false,
        });
        return true;
      }

      // 拉取失败：尝试使用本地缓存
      await get().loadFromCache();
      set({ isOfflineMode: true, isLoading: false });
      return false;
    } catch {
      await get().loadFromCache();
      set({ isOfflineMode: true, isLoading: false });
      return false;
    }
  },

  loadFromCache: async () => {
    try {
      const cached = await getItem<AppConfig>(STORAGE_KEYS.APP_CONFIG);
      const cachedVersions = await getItem<AppVersion>(STORAGE_KEYS.APP_VERSIONS);
      const lastSync = await getItem<string>(STORAGE_KEYS.LAST_SYNC_AT);
      if (cached) {
        set({ config: cached, versions: cachedVersions, lastSyncAt: lastSync });
      }
    } catch {
      set({ isOfflineMode: true, isLoading: false });
    }
  },

  setOfflineMode: (offline) => set({ isOfflineMode: offline }),

  getEffectiveConfig: () => {
    return get().config ?? DEFAULT_APP_CONFIG;
  },
}));


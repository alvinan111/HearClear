/**
 * 远程配置 + 离线容灾 服务
 *
 * 启动流程：
 * 1. 尝试从服务端拉取 app_config + profiles + app_versions
 * 2. 成功 → 更新 configStore + subscriptionStore，写入 AsyncStorage 缓存
 * 3. 失败 → 从 AsyncStorage 读取缓存兜底，设置离线模式
 *
 * 离线模式下：
 * - 已付费用户：正常使用全部功能
 * - 未付费用户：仅基础放大，配置锁定
 *
 * 网络恢复后：自动重新同步
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { useConfigStore } from '@stores/config-store';
import { useSubscriptionStore } from '@stores/subscription-store';
import { useAudioStore } from '@stores/audio-store';
import { useAuthStore } from '@stores/auth-store';
import { TRIAL_DEFAULTS } from '@constants/trial';
import { fetchAppVersion } from './api';

let networkUnsubscribe: (() => void) | null = null;
let syncInProgress = false;

/**
 * 应用启动时调用：拉取所有远程数据，设置离线容灾
 */
export async function initRemoteConfig(): Promise<{
  needsForceUpdate: boolean;
  suggestUpdate: boolean;
  updateUrl: string;
}> {
  const result = { needsForceUpdate: false, suggestUpdate: false, updateUrl: '' };

  // 检查网络状态
  const netState = await NetInfo.fetch();
  const isOnline = netState.isConnected && netState.isInternetReachable;

  const configStore = useConfigStore.getState();
  const authStore = useAuthStore.getState();
  const subscriptionStore = useSubscriptionStore.getState();

  if (isOnline) {
    // 在线：同步远程配置
    const syncSuccess = await configStore.syncConfig();

    if (syncSuccess) {
      // 版本检查
      const platform = Platform.OS as 'ios' | 'android';
      const versionInfo = await fetchAppVersion(platform);
      if (versionInfo) {
        const currentVersion = Application.nativeApplicationVersion ?? '1.0.0';
        result.updateUrl = versionInfo.updateUrl;
        result.needsForceUpdate = compareVersion(currentVersion, versionInfo.minVersion) < 0;
        result.suggestUpdate = !result.needsForceUpdate &&
          compareVersion(currentVersion, versionInfo.latestVersion) < 0;
      }
    }

    // 同步订阅状态
    if (authStore.user) {
      const config = configStore.getEffectiveConfig();
      await subscriptionStore.syncSubscription(
        authStore.user.id,
        authStore.user,
        config.defaultTrialDays
      );
    }
  } else {
    // 离线：使用本地缓存
    await configStore.syncConfig(); // 内部会 fallback 到缓存
    const config = configStore.getEffectiveConfig();

    if (authStore.user) {
      await subscriptionStore.loadFromCache(authStore.user, config.defaultTrialDays);
    } else {
      await subscriptionStore.loadFromCache(null, TRIAL_DEFAULTS.TRIAL_DAYS);
    }
  }

  // 根据付费状态决定配置锁
  applyOfflineLock();

  // 监听网络恢复
  startNetworkListener();

  return result;
}

/**
 * 根据付费状态 + 离线状态决定是否锁定配置
 */
function applyOfflineLock() {
  const { isOfflineMode } = useConfigStore.getState();
  const { isPaid } = useSubscriptionStore.getState();
  // 离线 + 未付费 → 锁定配置
  const shouldLock = isOfflineMode && !isPaid;
  useAudioStore.getState().setConfigLocked(shouldLock);
}

/**
 * 监听网络恢复，自动重新同步
 */
function startNetworkListener() {
  if (networkUnsubscribe) {
    networkUnsubscribe();
  }

  networkUnsubscribe = NetInfo.addEventListener(async (state: NetInfoState) => {
    const isNowOnline = state.isConnected && state.isInternetReachable;
    const { isOfflineMode } = useConfigStore.getState();

    if (isNowOnline && isOfflineMode && !syncInProgress) {
      syncInProgress = true;
      try {
        const configStore = useConfigStore.getState();
        const success = await configStore.syncConfig();

        if (success) {
          const authStore = useAuthStore.getState();
          const config = configStore.getEffectiveConfig();
          if (authStore.user) {
            await useSubscriptionStore.getState().syncSubscription(
              authStore.user.id,
              authStore.user,
              config.defaultTrialDays
            );
          }
          applyOfflineLock();
        }
      } finally {
        syncInProgress = false;
      }
    }
  });
}

/** 停止网络监听（App 退出时调用） */
export function cleanupRemoteConfig() {
  if (networkUnsubscribe) {
    networkUnsubscribe();
    networkUnsubscribe = null;
  }
}

/**
 * 版本号比较（semver 简化版）
 * 返回 -1 (a < b), 0 (a == b), 1 (a > b)
 */
function compareVersion(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (aParts[i] ?? 0) - (bParts[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

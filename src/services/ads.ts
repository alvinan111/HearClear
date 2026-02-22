/**
 * 穿山甲广告服务
 *
 * 说明：穿山甲 SDK 需要通过 Expo Config Plugin 或手动 native 集成。
 * 此文件是抽象封装层，提供统一的广告 API，实际 Native 调用通过
 * NativeModules.PangleAds 暴露（需自行实现 Config Plugin）。
 *
 * 付费会员完全不调用广告，通过 adsEnabled + isPaid 双重检查。
 */

import { Platform, NativeModules } from 'react-native';
import { useConfigStore } from '@stores/config-store';
import { useSubscriptionStore } from '@stores/subscription-store';
import { useAuthStore } from '@stores/auth-store';
import { trackAdEvent } from './api';

const PangleAds = NativeModules.PangleAds as {
  init?: (appId: string) => Promise<void>;
  showSplashAd?: (adId: string, maxDuration: number) => Promise<{ skipped: boolean }>;
  loadBannerAd?: (adId: string, viewTag: number) => Promise<void>;
} | undefined;

let initialized = false;

/**
 * 初始化穿山甲 SDK（App 启动时调用一次）
 */
export async function initPangleAds(appId: string): Promise<void> {
  if (initialized || !PangleAds?.init) return;
  try {
    await PangleAds.init(appId);
    initialized = true;
  } catch (e) {
    console.warn('[ads] Pangle init failed:', e);
  }
}

/**
 * 展示开屏广告
 * 在 App 完全加载前调用，付费用户直接跳过
 */
export async function showSplashAd(): Promise<void> {
  const { isPaid } = useSubscriptionStore.getState();
  const { getEffectiveConfig } = useConfigStore.getState();
  const config = getEffectiveConfig();
  const { user } = useAuthStore.getState();

  // 付费用户 OR 广告总开关关闭 OR 开屏广告关闭 → 跳过
  if (isPaid || !config.adsEnabled || !config.splashAdEnabled) return;

  const platform = Platform.OS as 'ios' | 'android';
  const adId = config.splashAdId[platform];
  if (!adId || !PangleAds?.showSplashAd) return;

  try {
    await PangleAds.showSplashAd(adId, config.splashAdDuration);
    await trackAdEvent({
      userId: user?.id ?? null,
      adType: 'splash',
      adId,
      event: 'impression',
      platform,
    });
  } catch (e) {
    await trackAdEvent({
      userId: user?.id ?? null,
      adType: 'splash',
      adId,
      event: 'error',
      platform,
    });
  }
}

/**
 * 检查当前是否应该展示 Banner 广告
 */
export function shouldShowBannerAd(): boolean {
  const { isPaid } = useSubscriptionStore.getState();
  const { getEffectiveConfig } = useConfigStore.getState();
  const config = getEffectiveConfig();
  return !isPaid && config.adsEnabled && config.bannerAdEnabled;
}

/**
 * 获取 Banner 广告位 ID
 */
export function getBannerAdId(): string {
  const { getEffectiveConfig } = useConfigStore.getState();
  const config = getEffectiveConfig();
  const platform = Platform.OS as 'ios' | 'android';
  return config.bannerAdId[platform];
}

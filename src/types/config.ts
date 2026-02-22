export interface AppConfig {
  /** 新用户默认是否开启付费 */
  defaultPaywallEnabled: boolean;
  /** 全局默认试用天数 */
  defaultTrialDays: number;
  /** 各方案价格（单位：分） */
  prices: {
    daily: number;
    monthly: number;
    yearly: number;
    lifetime: number;
  };
  /** 推荐方案 */
  recommendedPlan: 'daily' | 'monthly' | 'yearly' | 'lifetime';
  /** 全局公告（null = 无公告） */
  announcement: string | null;
  /** 广告总开关 */
  adsEnabled: boolean;
  /** 开屏广告开关 */
  splashAdEnabled: boolean;
  /** Banner 广告开关 */
  bannerAdEnabled: boolean;
  /** 穿山甲广告位 ID */
  splashAdId: { ios: string; android: string };
  bannerAdId: { ios: string; android: string };
  /** 开屏广告最长展示秒数 */
  splashAdDuration: number;
}

export interface AppVersion {
  platform: 'ios' | 'android';
  latestVersion: string;
  minVersion: string;
  updateUrl: string;
  releaseNotes: string | null;
}

export interface RemoteConfigState {
  config: AppConfig | null;
  versions: AppVersion | null;
  /** 上次成功同步时间 */
  lastSyncAt: string | null;
  /** 是否处于离线降级模式 */
  isOfflineMode: boolean;
  isLoading: boolean;
}

/** 默认本地配置（网络完全不可用时的最终兜底） */
export const DEFAULT_APP_CONFIG: AppConfig = {
  defaultPaywallEnabled: true,
  defaultTrialDays: 3,
  prices: {
    daily: 100,
    monthly: 1800,
    yearly: 12800,
    lifetime: 29800,
  },
  recommendedPlan: 'yearly',
  announcement: null,
  adsEnabled: false, // 离线时不展示广告
  splashAdEnabled: false,
  bannerAdEnabled: false,
  splashAdId: { ios: '', android: '' },
  bannerAdId: { ios: '', android: '' },
  splashAdDuration: 5,
};

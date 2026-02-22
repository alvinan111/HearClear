/**
 * 应用全局配置
 */

export const APP_CONFIG = {
  /** App 名称 */
  NAME_ZH: 'AI助听器',
  NAME_EN: 'HearClear',

  /** 版本号（与 app.json 保持一致） */
  VERSION: '1.0.0',

  /** 支持的平台 */
  PLATFORMS: {
    APP_STORE_URL: 'https://apps.apple.com/app/hearclear',
    PLAY_STORE_URL: 'https://play.google.com/store/apps/details?id=com.hearclear.app',
    HUAWEI_URL: 'https://appgallery.huawei.com/app/hearclear',
  },

  /** 公司/团队信息 */
  COMPANY: {
    NAME: 'HearClear Team',
    EMAIL: 'support@hearclear.app',
    WEBSITE: 'https://hearclear.app',
    PRIVACY_URL: 'https://hearclear.app/privacy',
    TERMS_URL: 'https://hearclear.app/terms',
  },
};

/** Supabase 配置（从环境变量读取） */
export const SUPABASE_CONFIG = {
  URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

/**
 * 试用期相关常量
 * 实际值以服务端远程配置为准，这里是客户端本地默认值（离线兜底）
 */

export const TRIAL_DEFAULTS = {
  /** 默认试用天数（离线兜底） */
  TRIAL_DAYS: 3,
  /** 是否默认开启付费（离线兜底） */
  PAYWALL_ENABLED: true,
  /** 本地缓存有效期（天）：超过此天数缓存视为过期 */
  CACHE_VALID_DAYS: 7,
};

/** AsyncStorage 键名 */
export const STORAGE_KEYS = {
  /** 首次使用时间戳 */
  FIRST_USE_AT: 'hearclear:first_use_at',
  /** 远程配置缓存 */
  APP_CONFIG: 'hearclear:app_config',
  /** 用户 profile 缓存 */
  USER_PROFILE: 'hearclear:user_profile',
  /** 版本信息缓存 */
  APP_VERSIONS: 'hearclear:app_versions',
  /** 上次成功同步时间戳 */
  LAST_SYNC_AT: 'hearclear:last_sync_at',
  /** 引导页是否已完成 */
  ONBOARDING_DONE: 'hearclear:onboarding_done',
  /** 隐私协议是否已同意 */
  PRIVACY_AGREED: 'hearclear:privacy_agreed',
  /** 上次使用的音频参数（用于离线默认值） */
  LAST_AUDIO_PARAMS: 'hearclear:last_audio_params',
};

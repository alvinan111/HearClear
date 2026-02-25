/**
 * 试用期与存储键常量
 */
import { TRIAL_DEFAULTS, STORAGE_KEYS } from '@constants/trial';

describe('TRIAL_DEFAULTS', () => {
  it('TRIAL_DAYS 为正整数', () => {
    expect(TRIAL_DEFAULTS.TRIAL_DAYS).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(TRIAL_DEFAULTS.TRIAL_DAYS)).toBe(true);
  });

  it('PAYWALL_ENABLED 为布尔', () => {
    expect(typeof TRIAL_DEFAULTS.PAYWALL_ENABLED).toBe('boolean');
  });

  it('CACHE_VALID_DAYS 为正整数', () => {
    expect(TRIAL_DEFAULTS.CACHE_VALID_DAYS).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(TRIAL_DEFAULTS.CACHE_VALID_DAYS)).toBe(true);
  });
});

describe('STORAGE_KEYS', () => {
  it('所有键均为非空字符串且含 hearclear 前缀', () => {
    const keys = Object.values(STORAGE_KEYS);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      expect(typeof k).toBe('string');
      expect(k.length).toBeGreaterThan(0);
      expect(k.startsWith('hearclear:')).toBe(true);
    }
  });

  it('包含 FIRST_USE_AT、ONBOARDING_DONE、PRIVACY_AGREED、LAST_AUDIO_PARAMS', () => {
    expect(STORAGE_KEYS.FIRST_USE_AT).toBeDefined();
    expect(STORAGE_KEYS.ONBOARDING_DONE).toBeDefined();
    expect(STORAGE_KEYS.PRIVACY_AGREED).toBeDefined();
    expect(STORAGE_KEYS.LAST_AUDIO_PARAMS).toBeDefined();
  });
});

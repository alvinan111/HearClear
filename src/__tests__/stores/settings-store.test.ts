/**
 * 设置 Store：语言、隐私协议、引导页状态
 */
const mockChangeLanguage = jest.fn();
jest.mock('@i18n/index', () => ({
  __esModule: true,
  default: { changeLanguage: mockChangeLanguage },
  detectLanguage: () => 'zh' as const,
}));

import { useSettingsStore } from '@stores/settings-store';

beforeEach(() => {
  mockChangeLanguage.mockClear();
  useSettingsStore.setState({
    language: 'zh',
    privacyAgreed: false,
    onboardingDone: false,
  });
});

describe('初始状态', () => {
  it('language 为 zh（与 detectLanguage 一致）', () => {
    expect(useSettingsStore.getState().language).toBe('zh');
  });

  it('privacyAgreed 为 false', () => {
    expect(useSettingsStore.getState().privacyAgreed).toBe(false);
  });

  it('onboardingDone 为 false', () => {
    expect(useSettingsStore.getState().onboardingDone).toBe(false);
  });
});

describe('setLanguage', () => {
  it('更新 language 并调用 i18n.changeLanguage', () => {
    useSettingsStore.getState().setLanguage('en');
    expect(useSettingsStore.getState().language).toBe('en');
    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
  });

  it('切回 zh', () => {
    useSettingsStore.getState().setLanguage('en');
    useSettingsStore.getState().setLanguage('zh');
    expect(useSettingsStore.getState().language).toBe('zh');
    expect(mockChangeLanguage).toHaveBeenLastCalledWith('zh');
  });
});

describe('setPrivacyAgreed', () => {
  it('设为 true', () => {
    useSettingsStore.getState().setPrivacyAgreed(true);
    expect(useSettingsStore.getState().privacyAgreed).toBe(true);
  });

  it('设为 false', () => {
    useSettingsStore.getState().setPrivacyAgreed(true);
    useSettingsStore.getState().setPrivacyAgreed(false);
    expect(useSettingsStore.getState().privacyAgreed).toBe(false);
  });
});

describe('setOnboardingDone', () => {
  it('设为 true', () => {
    useSettingsStore.getState().setOnboardingDone(true);
    expect(useSettingsStore.getState().onboardingDone).toBe(true);
  });

  it('设为 false', () => {
    useSettingsStore.getState().setOnboardingDone(true);
    useSettingsStore.getState().setOnboardingDone(false);
    expect(useSettingsStore.getState().onboardingDone).toBe(false);
  });
});

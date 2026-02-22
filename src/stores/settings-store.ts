import { create } from 'zustand';
import type { SupportedLanguage } from '@i18n/index';
import i18n, { detectLanguage } from '@i18n/index';

interface SettingsStore {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  /** 隐私协议是否已同意 */
  privacyAgreed: boolean;
  setPrivacyAgreed: (agreed: boolean) => void;
  /** 引导页是否已完成 */
  onboardingDone: boolean;
  setOnboardingDone: (done: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  language: detectLanguage(),
  setLanguage: (lang) => {
    i18n.changeLanguage(lang);
    set({ language: lang });
  },

  privacyAgreed: false,
  setPrivacyAgreed: (agreed) => set({ privacyAgreed: agreed }),

  onboardingDone: false,
  setOnboardingDone: (done) => set({ onboardingDone: done }),
}));

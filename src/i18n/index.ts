import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import zh from './zh';
import en from './en';

export type SupportedLanguage = 'zh' | 'en';

/**
 * 根据系统语言自动选择：中文系统 -> zh，其他 -> en
 */
function detectLanguage(): SupportedLanguage {
  const locales = Localization.getLocales();
  if (locales.length > 0) {
    const languageCode = locales[0].languageCode ?? '';
    if (languageCode.startsWith('zh')) {
      return 'zh';
    }
  }
  return 'en';
}

const resources = {
  zh: { translation: zh },
  en: { translation: en },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: detectLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
  });

export default i18n;

export { detectLanguage };

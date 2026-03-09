import { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useSettingsStore } from '@stores/settings-store';
import { getItem } from '@utils/storage';
import { STORAGE_KEYS } from '@constants/trial';
import { COLORS } from '@constants/theme';

const STORAGE_TIMEOUT_MS = 500;
const HARD_TIMEOUT_MS = 1200;
const NAV_GUARD_MS = 2500; // 若仍未跳转则再次尝试

/** 带超时的 getItem，超时返回 null */
function getItemWithTimeout<T>(key: string): Promise<T | null> {
  return Promise.race([
    getItem<T>(key),
    new Promise<T | null>((resolve) => setTimeout(() => resolve(null), STORAGE_TIMEOUT_MS)),
  ]);
}

/**
 * 入口页：决定路由到哪里
 * 首次启动 -> 引导页，其他 -> 主 Tab 页
 * AsyncStorage 最多等 800ms，总等待不超过 2s，否则直接进主 Tab 防卡死。
 */
export default function IndexScreen() {
  const router = useRouter();
  const onboardingDone = useSettingsStore((s) => s.onboardingDone);
  const didNavigate = useRef(false);

  useEffect(() => {
    if (didNavigate.current) return;
    let cancelled = false;
    let hardTimeoutId: ReturnType<typeof setTimeout>;

    const go = (path: string) => {
      if (cancelled || didNavigate.current) return;
      didNavigate.current = true;
      SplashScreen.hideAsync?.();
      const doReplace = () => {
        try {
          router.replace(path as any);
        } catch (e) {
          didNavigate.current = false;
        }
      };
      setTimeout(doReplace, 0);
    };

    hardTimeoutId = setTimeout(() => {
      if (!didNavigate.current) go('/(tabs)');
    }, HARD_TIMEOUT_MS);

    // 兜底：若 HARD_TIMEOUT 后仍未离开本页（如 router 未就绪），再次尝试
    const guardId = setTimeout(() => {
      if (didNavigate.current) return;
      go('/(tabs)');
    }, NAV_GUARD_MS);

    (async () => {
      try {
        const storedOnboardingDone = await getItemWithTimeout<boolean>(STORAGE_KEYS.ONBOARDING_DONE);
        if (cancelled) return;
        if (!storedOnboardingDone && !onboardingDone) {
          go('/onboarding');
        } else {
          go('/(tabs)');
        }
      } catch {
        if (!cancelled) go('/(tabs)');
      } finally {
        clearTimeout(hardTimeoutId);
        clearTimeout(guardId);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(hardTimeoutId);
      clearTimeout(guardId);
    };
  }, [onboardingDone]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

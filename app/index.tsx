import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, InteractionManager } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@stores/settings-store';
import { getItem } from '@utils/storage';
import { STORAGE_KEYS } from '@constants/trial';
import { COLORS } from '@constants/theme';

const NAV_TIMEOUT_MS = 3000;

/**
 * 入口页：决定路由到哪里
 * 首次启动 -> 引导页
 * 未同意隐私 -> 隐私弹窗（在主布局处理）
 * 其他 -> 主 Tab 页
 * 若 getItem 或路由超时，则默认进入主 Tab 页，避免卡死。
 */
export default function IndexScreen() {
  const router = useRouter();
  const onboardingDone = useSettingsStore((s) => s.onboardingDone);
  const didNavigate = useRef(false);

  useEffect(() => {
    if (didNavigate.current) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const go = (path: string) => {
      if (cancelled || didNavigate.current) return;
      didNavigate.current = true;
      try {
        router.replace(path as any);
      } catch (e) {
        didNavigate.current = false;
      }
    };

    const task = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      timeoutId = setTimeout(() => {
        if (didNavigate.current) return;
        go('/(tabs)');
      }, NAV_TIMEOUT_MS);

      (async () => {
        try {
          const storedOnboardingDone = await getItem<boolean>(STORAGE_KEYS.ONBOARDING_DONE);
          if (cancelled) return;
          if (!storedOnboardingDone && !onboardingDone) {
            go('/onboarding');
          } else {
            go('/(tabs)');
          }
        } catch {
          if (!cancelled) go('/(tabs)');
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }
      })();
    });

    return () => {
      cancelled = true;
      task.cancel();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [onboardingDone]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

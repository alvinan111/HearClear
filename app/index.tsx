import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@stores/settings-store';
import { getItem } from '@utils/storage';
import { STORAGE_KEYS } from '@constants/trial';
import { COLORS } from '@constants/theme';

/**
 * 入口页：决定路由到哪里
 * 首次启动 -> 引导页
 * 未同意隐私 -> 隐私弹窗（在主布局处理）
 * 其他 -> 主 Tab 页
 */
export default function IndexScreen() {
  const router = useRouter();
  const onboardingDone = useSettingsStore((s) => s.onboardingDone);

  useEffect(() => {
    async function navigate() {
      const storedOnboardingDone = await getItem<boolean>(STORAGE_KEYS.ONBOARDING_DONE);
      if (!storedOnboardingDone && !onboardingDone) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    }
    navigate();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

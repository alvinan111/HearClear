import '../src/i18n'; // 初始化 i18n
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@stores/auth-store';
import { useAudioStore } from '@stores/audio-store';
import { AppErrorBoundary } from '@components/AppErrorBoundary';

// 防止原生启动图在未调用 hideAsync 前自动消失导致白屏；由本 layout 在就绪后主动隐藏
SplashScreen.preventAutoHideAsync?.();

export default function RootLayout() {
  const loadCurrentUser = useAuthStore((s) => s.loadCurrentUser);
  const hydrateFromStorage = useAudioStore((s) => s.hydrateFromStorage);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    hydrateFromStorage();
  }, []);

  // 尽早隐藏原生启动图，避免卡在启动页（真机常见）
  useEffect(() => {
    const t = setTimeout(() => {
      SplashScreen.hideAsync?.();
    }, 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppErrorBoundary>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="paywall" />
          <Stack.Screen name="hearing-test" />
          <Stack.Screen name="legal" />
        </Stack>
      </AppErrorBoundary>
    </GestureHandlerRootView>
  );
}

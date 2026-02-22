/**
 * 后台音频保活服务
 *
 * iOS:  UIBackgroundModes ['audio'] + staysActiveInBackground → 锁屏后持续运行
 * Android: 持久前台通知保活进程（仅 Development Build 支持；Expo Go 跳过）
 *
 * 注意：expo-notifications 的 Android 推送在 Expo Go SDK53+ 已移除，
 *       通知保活仅在 Dev Build / 生产包中生效。
 */

import { Platform, AppState, type AppStateStatus } from 'react-native';
import Constants from 'expo-constants';
import { setAudioModeAsync } from 'expo-audio';

// ─── 是否运行在 Expo Go（不支持通知保活） ────────────────────────────────────
const isExpoGo = Constants.appOwnership === 'expo';

const NOTIFICATION_ID = 'hearclear-background-audio';
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

// ─── 初始化通知渠道（仅 Dev Build / 生产包执行） ─────────────────────────────
export async function initBackgroundService(): Promise<void> {
  if (isExpoGo || Platform.OS !== 'android') return;

  try {
    const Notifications = await import('expo-notifications');
    await Notifications.setNotificationChannelAsync('audio-service', {
      name: '助听服务',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      vibrationPattern: null,
      enableVibrate: false,
      showBadge: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // 忽略 Expo Go 中的加载失败
  }
}

// ─── 申请通知权限（仅 Dev Build） ────────────────────────────────────────────
async function requestNotificationPermission(): Promise<boolean> {
  if (isExpoGo) return false;
  try {
    const Notifications = await import('expo-notifications');
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    if (!canAskAgain) return false;
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === 'granted';
  } catch {
    return false;
  }
}

// ─── 启动后台保活 ─────────────────────────────────────────────────────────────
export async function startBackgroundAudio(): Promise<void> {
  // expo-audio 新 API 设置音频模式
  await setAudioModeAsync({
    playsInSilentMode: true,           // iOS 静音键不影响
    shouldDuckAndroid: false,
    allowsRecording: true,
    interruptionMode: 'mixWithOthers', // 与其他音频共存
  }).catch(() => {});

  // Android Dev Build：发布持久前台通知
  if (!isExpoGo && Platform.OS === 'android') {
    await requestNotificationPermission();
    try {
      const Notifications = await import('expo-notifications');
      await Notifications.scheduleNotificationAsync({
        identifier: NOTIFICATION_ID,
        content: {
          title: '🎧 HearClear 助听运行中',
          body: '点击返回应用 · 长按可停止',
          sticky: true,
          autoDismiss: false,
          priority: Notifications.AndroidNotificationPriority.LOW,
          android: {
            channelId: 'audio-service',
            ongoing: true,
            smallIcon: 'ic_launcher',
          },
        } as import('expo-notifications').NotificationContentInput,
        trigger: null,
      });
    } catch {
      // 通知发布失败不影响音频运行
    }
  }

  // 监听 AppState 变化
  appStateSubscription?.remove();
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
}

// ─── 停止后台保活 ─────────────────────────────────────────────────────────────
export async function stopBackgroundAudio(): Promise<void> {
  // 恢复普通音频模式
  await setAudioModeAsync({
    playsInSilentMode: false,
    shouldDuckAndroid: true,
    allowsRecording: false,
    interruptionMode: 'doNotMix',
  }).catch(() => {});

  // 撤销 Android 通知
  if (!isExpoGo && Platform.OS === 'android') {
    try {
      const Notifications = await import('expo-notifications');
      await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
    } catch { /* 忽略 */ }
  }

  appStateSubscription?.remove();
  appStateSubscription = null;
}

// ─── AppState 变化处理 ────────────────────────────────────────────────────────
function handleAppStateChange(nextState: AppStateStatus): void {
  if (isExpoGo || Platform.OS !== 'android') return;
  if (nextState !== 'background' && nextState !== 'inactive') return;

  // 确保持久通知还在（用户可能滑掉了）
  import('expo-notifications').then((Notifications) => {
    Notifications.getPresentedNotificationsAsync().then((list) => {
      const exists = list.some((n) => n.request.identifier === NOTIFICATION_ID);
      if (!exists) startBackgroundAudio().catch(() => {});
    });
  }).catch(() => {});
}

import { useState, useCallback, useEffect } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { requestRecordingPermissionsAsync, getRecordingPermissionsAsync } from 'expo-audio';

export type PermissionStatus = 'unknown' | 'granted' | 'denied' | 'blocked';

export function useAudioPermission() {
  const [status, setStatus] = useState<PermissionStatus>('unknown');

  useEffect(() => {
    getRecordingPermissionsAsync().then(({ status: s }) => {
      if (s === 'granted') setStatus('granted');
      else if (s === 'denied') setStatus('denied');
    }).catch(() => {});
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status: currentStatus, canAskAgain } =
        await requestRecordingPermissionsAsync();

      if (currentStatus === 'granted') {
        setStatus('granted');
        return true;
      }

      if (!canAskAgain) {
        setStatus('blocked');
        Alert.alert(
          '需要麦克风权限',
          '请前往 设置 → HearClear → 麦克风，允许访问后返回重试。',
          [
            { text: '稍后再说', style: 'cancel' },
            {
              text: '去设置',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
      } else {
        setStatus('denied');
        Alert.alert(
          '需要麦克风权限',
          '助听功能需要通过麦克风采集声音，请允许权限后重试。',
          [{ text: '知道了' }]
        );
      }

      return false;
    } catch {
      return false;
    }
  }, []);

  return { status, requestPermission };
}

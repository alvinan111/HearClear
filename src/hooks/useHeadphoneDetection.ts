/**
 * 耳机连接检测 Hook（支持蓝牙 + 有线）
 *
 * 使用 react-native-audio-api 的 AudioManager.getDevicesInfo() 检测输出设备：
 *   - availableOutputs / currentOutputs 中若含耳机/蓝牙设备 → 耳机已连接
 *   - 仅内置扬声器/听筒 → 外放模式
 *
 * 同时监听 routeChange 事件实时更新。
 * 若 react-native-audio-api 不可用（Expo Go），回退到 Android 插拔事件 + 手动切换。
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Platform,
  AppState,
  type AppStateStatus,
  DeviceEventEmitter,
} from 'react-native';

let AudioManager: import('react-native-audio-api').default | null = null;
try {
  const api = require('react-native-audio-api');
  AudioManager = api.AudioManager;
} catch {
  AudioManager = null;
}

const HEADPHONE_CATEGORIES = [
  'headphone', 'headset', 'headphones',
  'bluetooth', 'bluetootha2dp', 'bluetoothhfp', 'bluetootha2dpoutput',
  'lineout', 'usb', 'usbaudio',
  'wired', 'wiredheadset',
  'type_wired_headphones', 'type_bluetooth_a2dp', 'type_wired_headset',
  'headphonesoutput', 'headsetoutput',
];

function isHeadphoneOutput(device: { category?: string; name?: string }): boolean {
  const cat = (device.category ?? '').toLowerCase();
  const name = (device.name ?? '').toLowerCase();
  const combined = `${cat} ${name}`;
  return HEADPHONE_CATEGORIES.some((k) => combined.includes(k));
}

async function detectViaAudioManager(): Promise<boolean> {
  if (!AudioManager) return false;
  try {
    const info = await AudioManager.getDevicesInfo();
    const outputs = info.currentOutputs?.length ? info.currentOutputs : info.availableOutputs ?? [];
    return outputs.some(isHeadphoneOutput);
  } catch {
    return false;
  }
}

export function useHeadphoneDetection() {
  const [isConnected, setIsConnected] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const routeSubRef = useRef<{ remove: () => void } | null>(null);

  const detect = useCallback(async () => {
    const result = await detectViaAudioManager();
    setIsConnected(result);
  }, []);

  useEffect(() => {
    detect();

    // 轮询（蓝牙连接/断开可能无事件）
    pollingRef.current = setInterval(detect, 2000);

    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') detect();
    });

    const subs: Array<{ remove: () => void }> = [];
    if (Platform.OS === 'android') {
      subs.push(
        DeviceEventEmitter.addListener('onAudioDeviceChanged', () => detect()),
        DeviceEventEmitter.addListener('HeadphonesConnected', () => setIsConnected(true)),
        DeviceEventEmitter.addListener('HeadphonesDisconnected', () => setIsConnected(false)),
        DeviceEventEmitter.addListener('onAudioFocusChanged', () => detect())
      );
    }

    if (AudioManager) {
      const sub = AudioManager.addSystemEventListener?.('routeChange', () => detect());
      if (sub) routeSubRef.current = sub;
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      appStateSub.remove();
      subs.forEach((s) => s.remove());
      routeSubRef.current?.remove?.();
    };
  }, [detect]);

  const toggleManual = useCallback(() => {
    setIsConnected((v) => !v);
  }, []);

  return { isConnected, toggleManual };
}

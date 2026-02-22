/**
 * 耳机连接检测 Hook（支持蓝牙 + 有线）
 *
 * 检测策略（多重保险）：
 *
 * 1. 主动轮询 Audio.getAvailableInputsAsync()
 *    - expo-av 在 Expo Go 中有效
 *    - 能检测到蓝牙 HFP 耳机（有麦克风）和有线耳机
 *    - 每 2 秒轮询一次，App 回前台时立即检测
 *
 * 2. Android DeviceEventEmitter（ACTION_HEADSET_PLUG）
 *    - 仅对有线耳机有效，蓝牙无效
 *    - 作为辅助事件源
 *
 * 3. iOS NativeEventEmitter（AVAudioSession routeChange）
 *    - 通过 ExpoAV 模块监听，对蓝牙和有线均有效
 *
 * 4. 手动切换（UI 降级方案）
 *    - 任何情况下用户均可手动切换
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Platform,
  AppState,
  type AppStateStatus,
  DeviceEventEmitter,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';
import { Audio } from 'expo-av';

// 判断输入设备类型是否属于外接耳机（含蓝牙）
function isExternalDevice(type: string): boolean {
  const external = [
    'bluetooth',      // 蓝牙通用
    'bluetoothhfp',   // 蓝牙耳机（有麦克风）
    'bluetootha2dp',  // 蓝牙音频（仅输出）
    'headphones',     // 有线耳机
    'headset',        // 有线耳麦
    'lineout',        // 线路输出
    'usbheadset',     // USB 耳机
  ];
  return external.some((k) => type.toLowerCase().includes(k));
}

// 通过 expo-av 检测当前是否有外接音频设备
async function detectViaAvailableInputs(): Promise<boolean> {
  try {
    const inputs = await Audio.getAvailableInputsAsync();
    // 若有任何非内置麦克风的输入，说明有外接设备（蓝牙/有线）
    return inputs.some((input) => {
      const t = (input.type ?? '').toLowerCase();
      return t !== 'microphonebuiltin' && t !== '' && isExternalDevice(t);
    });
  } catch {
    return false;
  }
}

export function useHeadphoneDetection() {
  const [isConnected, setIsConnected] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 主动检测（立即执行）
  const detect = useCallback(async () => {
    const result = await detectViaAvailableInputs();
    setIsConnected(result);
  }, []);

  useEffect(() => {
    // 初始化音频会话（让 AVAudioSession 激活，才能列出设备）
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    } as Parameters<typeof Audio.setAudioModeAsync>[0]).catch(() => {});

    // 立即检测一次
    detect();

    // ── 每 2 秒轮询（蓝牙连接/断开不会触发事件，需靠轮询）
    pollingRef.current = setInterval(detect, 2000);

    // ── AppState：回前台时立刻检测
    const appStateSub = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (state === 'active') detect();
      }
    );

    // ── Android 有线耳机插拔事件（辅助）
    const subs: Array<{ remove: () => void }> = [];
    if (Platform.OS === 'android') {
      subs.push(
        DeviceEventEmitter.addListener('onAudioDeviceChanged', () => detect()),
        DeviceEventEmitter.addListener('HeadphonesConnected', () => setIsConnected(true)),
        DeviceEventEmitter.addListener('HeadphonesDisconnected', () => setIsConnected(false)),
        // Android ACTION_HEADSET_PLUG via RN bridge
        DeviceEventEmitter.addListener('onAudioFocusChanged', () => detect()),
      );
    }

    // ── iOS AVAudioSession routeChangeNotification（辅助）
    if (Platform.OS === 'ios') {
      try {
        const ExpoAV = NativeModules.ExpoAV;
        if (ExpoAV) {
          const emitter = new NativeEventEmitter(ExpoAV);
          subs.push(
            emitter.addListener('ExpoAV.onAudioRouteChanged', () => detect())
          );
        }
      } catch { /* 忽略 */ }
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      appStateSub.remove();
      subs.forEach((s) => s.remove());
    };
  }, [detect]);

  // 手动切换（UI 备用）
  const toggleManual = useCallback(() => {
    setIsConnected((v) => !v);
  }, []);

  return { isConnected, toggleManual };
}

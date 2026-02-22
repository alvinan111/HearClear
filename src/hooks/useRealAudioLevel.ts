/**
 * 实时麦克风音量 Hook（expo-av metering）
 *
 * 在 Expo Go 中通过 Audio.Recording + isMeteringEnabled 获取真实输入电平，
 * 返回 0~1 的归一化音量值（-60dBFS → 0，0dBFS → 1）。
 *
 * 在 Dev Build 中 AudioEngine 自带 AnalyserNode，本 hook 不启动 Recording。
 */
import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { AudioEngine } from '@services/audio/AudioEngine';
import { useAudioStore } from '@stores/audio-store';

// 每级柱状图的平滑系数（0 = 无平滑，1 = 完全不变）
const SMOOTH = 0.55;

export function useRealAudioLevel(): number {
  const [level, setLevel] = useState(0);
  const recRef = useRef<Audio.Recording | null>(null);
  const prevLevel = useRef(0);
  const status = useAudioStore((s) => s.status);
  const isRunning = status === 'running';

  useEffect(() => {
    // Dev Build 中 AudioEngine 自带频谱数据，不需要再起一个 Recording
    if (AudioEngine.isAvailable) return;

    if (!isRunning) {
      // 停止后平滑归零
      stopRecording();
      const decay = setInterval(() => {
        prevLevel.current *= 0.6;
        setLevel(prevLevel.current);
        if (prevLevel.current < 0.005) {
          prevLevel.current = 0;
          setLevel(0);
          clearInterval(decay);
        }
      }, 50);
      return () => clearInterval(decay);
    }

    startMetering();
    return () => { stopRecording(); };
  }, [isRunning]);

  async function startMetering() {
    try {
      const { status: perm } = await Audio.requestPermissionsAsync();
      if (perm !== 'granted') return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      } as Parameters<typeof Audio.setAudioModeAsync>[0]);

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });

      rec.setProgressUpdateInterval(40); // ~25fps

      rec.setOnRecordingStatusUpdate((s) => {
        if (!s.isRecording) return;
        const db = s.metering ?? -80;
        // -70dBFS → 0.0，0dBFS → 1.0（语音通常在 -40 ~ -10dBFS）
        const raw = Math.max(0, Math.min(1, (db + 70) / 70));
        // 指数平滑
        const smoothed = prevLevel.current * SMOOTH + raw * (1 - SMOOTH);
        prevLevel.current = smoothed;
        setLevel(smoothed);
      });

      await rec.startAsync();
      recRef.current = rec;
    } catch (e) {
      console.warn('[useRealAudioLevel] metering failed:', e);
    }
  }

  async function stopRecording() {
    if (recRef.current) {
      try {
        await recRef.current.stopAndUnloadAsync();
      } catch { /**/ }
      recRef.current = null;
    }
  }

  return level;
}

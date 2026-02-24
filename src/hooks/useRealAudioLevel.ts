/**
 * 实时麦克风音量 Hook（expo-audio metering）
 *
 * 在 Expo Go 中通过 useAudioRecorder + isMeteringEnabled 获取真实输入电平，
 * 返回 0~1 的归一化音量值（-60dBFS → 0，0dBFS → 1）。
 *
 * 在 Dev Build 中 AudioEngine 自带 AnalyserNode，本 hook 不启动 Recording。
 */
import { useEffect, useRef, useState } from 'react';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { AudioEngine } from '@services/audio/AudioEngine';
import { useAudioStore } from '@stores/audio-store';

// 每级柱状图的平滑系数（0 = 无平滑，1 = 完全不变）
const SMOOTH = 0.55;
const METERING_INTERVAL_MS = 40; // ~25fps

const recordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
} as const;

export function useRealAudioLevel(): number {
  const [level, setLevel] = useState(0);
  const prevLevel = useRef(0);
  const status = useAudioStore((s) => s.status);
  const isRunning = status === 'running';

  const recorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(recorder, METERING_INTERVAL_MS);

  useEffect(() => {
    if (!recorderState.isRecording) return;
    const rawMetering = recorderState.metering;
    if (rawMetering == null) return;
    // expo-audio metering: 可能是 dB（负值）或 0~1，统一转为 0~1
    const raw =
      rawMetering <= 0
        ? Math.max(0, Math.min(1, (rawMetering + 70) / 70))
        : Math.max(0, Math.min(1, rawMetering));
    const smoothed = prevLevel.current * SMOOTH + raw * (1 - SMOOTH);
    prevLevel.current = smoothed;
    setLevel(smoothed);
  }, [recorderState.isRecording, recorderState.metering]);

  useEffect(() => {
    if (AudioEngine.isAvailable) return;

    if (!isRunning) {
      if (recorder.isRecording) {
        recorder.stop().catch(() => {});
      }
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

    let cancelled = false;
    (async () => {
      try {
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted || cancelled) return;

        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          interruptionMode: 'mixWithOthers',
        });

        await recorder.prepareToRecordAsync({ isMeteringEnabled: true });
        if (cancelled) return;
        recorder.record();
      } catch (e) {
        console.warn('[useRealAudioLevel] metering failed:', e);
      }
    })();
    return () => {
      cancelled = true;
      recorder.stop().catch(() => {});
    };
  }, [isRunning]);

  return level;
}

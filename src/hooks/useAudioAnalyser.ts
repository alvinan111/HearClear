/**
 * useAudioAnalyser
 *
 * Dev Build  → 从 AudioEngine.getSpectrumData() 读取真实 FFT 频谱
 * Expo Go    → 用 useRealAudioLevel() 的麦克风电平驱动仿频谱形状的柱状图
 * 停止时     → 平滑归零
 */
import { useState, useEffect, useRef } from 'react';
import { AudioEngine } from '@services/audio/AudioEngine';
import { useAudioStore } from '@stores/audio-store';
import { useRealAudioLevel } from '@hooks/useRealAudioLevel';

const FRAME_MS = 40; // 25fps

export function useAudioAnalyser(numBars = 28) {
  const status = useAudioStore((s) => s.status);
  const isRunning = status === 'running';

  const [voiceBars, setVoiceBars] = useState<number[]>(() => new Array(numBars).fill(0));
  const [envBars, setEnvBars] = useState<number[]>(() => new Array(numBars).fill(0));

  // 真实麦克风电平（仅 Expo Go 使用）
  const realLevel = useRealAudioLevel();

  // 相位参数（让每根柱子有独立频率抖动，模拟频谱分布）
  const phases = useRef<number[]>(
    Array.from({ length: numBars }, (_, i) => i * 0.41)
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (!isRunning) {
      // 停止：逐帧衰减到零
      const decay = setInterval(() => {
        setVoiceBars((p) => {
          const n = p.map((v) => v * 0.55);
          if (n.every((v) => v < 0.005)) { clearInterval(decay); return new Array(numBars).fill(0); }
          return n;
        });
        setEnvBars((p) => p.map((v) => v * 0.55));
      }, FRAME_MS);
      return () => clearInterval(decay);
    }

    timerRef.current = setInterval(() => {
      if (AudioEngine.isAvailable) {
        // ── Dev Build：真实 FFT 数据
        const data = AudioEngine.getSpectrumData(numBars);
        if (data) {
          setVoiceBars(data.voice);
          setEnvBars(data.env);
        }
      } else {
        // ── Expo Go：用真实麦克风电平 × 频谱形状
        const lvl = realLevel; // 0~1，来自真实麦克风

        phases.current = phases.current.map((p, i) => p + 0.04 + i * 0.003);

        // 人声频谱形状：中低频突出（300~3000Hz），有细微抖动
        const voice = Array.from({ length: numBars }, (_, i) => {
          const center = numBars * 0.35;
          const spread = numBars * 0.3;
          const shape = Math.exp(-((i - center) * (i - center)) / (2 * spread * spread));
          // 每根柱子独立相位轻微抖动
          const flutter = Math.sin(phases.current[i]) * 0.08 * lvl;
          const raw = shape * lvl * 1.15 + flutter;
          return Math.max(0, Math.min(1, raw));
        });

        // 环境音形状：低频偏重（交通/空调），整体幅度更低且稳
        const env = Array.from({ length: numBars }, (_, i) => {
          const isLow = i < numBars / 2;
          const baseShape = isLow
            ? 0.6 * Math.exp(-i / (numBars * 0.28))
            : 0.15 * Math.exp(-((i - numBars * 0.65) * (i - numBars * 0.65)) / (numBars * 0.06));
          const noise = (Math.random() - 0.5) * 0.04;
          const slow = Math.sin(phases.current[i] * 0.3) * 0.02;
          // 环境音与麦克风电平挂钩，但幅度更低（背景噪声更稳）
          const raw = baseShape * (0.15 + lvl * 0.5) + noise + slow;
          return Math.max(0, Math.min(1, raw));
        });

        setVoiceBars(voice);
        setEnvBars(env);
      }
    }, FRAME_MS);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, realLevel, numBars]);

  return { voiceBars, envBars };
}

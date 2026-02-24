/**
 * @jest-environment jsdom
 */
// useAudioAnalyser：双频谱返回形状与长度约定，防止改坏导致人声/环境音条数或结构错误。

import { renderHook } from '@testing-library/react';
import { useAudioAnalyser } from '@hooks/useAudioAnalyser';

jest.mock('@stores/audio-store', () => ({
  useAudioStore: (selector: (s: { status: string }) => unknown) =>
    selector({ status: 'idle' }),
}));

jest.mock('@services/audio/AudioEngine', () => ({
  AudioEngine: { isAvailable: false, getSpectrumData: () => null },
}));

jest.mock('@hooks/useRealAudioLevel', () => ({ useRealAudioLevel: () => 0.5 }));

describe('useAudioAnalyser', () => {
  it('返回 voiceBars 与 envBars，长度等于 numBars', () => {
    const numBars = 24;
    const { result } = renderHook(() => useAudioAnalyser(numBars));
    expect(result.current.voiceBars).toHaveLength(numBars);
    expect(result.current.envBars).toHaveLength(numBars);
  });

  it('未运行时初始为全 0', () => {
    const { result } = renderHook(() => useAudioAnalyser(8));
    expect(result.current.voiceBars.every((v) => v === 0)).toBe(true);
    expect(result.current.envBars.every((v) => v === 0)).toBe(true);
  });

  it('不同 numBars 初始渲染返回对应长度', () => {
    const { result: r16 } = renderHook(() => useAudioAnalyser(16));
    expect(r16.current.voiceBars).toHaveLength(16);
    expect(r16.current.envBars).toHaveLength(16);
    const { result: r28 } = renderHook(() => useAudioAnalyser(28));
    expect(r28.current.voiceBars).toHaveLength(28);
    expect(r28.current.envBars).toHaveLength(28);
  });

  it('返回值为 number 数组（双频谱条可渲染）', () => {
    const { result } = renderHook(() => useAudioAnalyser(4));
    expect(result.current.voiceBars.every((v) => typeof v === 'number')).toBe(true);
    expect(result.current.envBars.every((v) => typeof v === 'number')).toBe(true);
  });
});

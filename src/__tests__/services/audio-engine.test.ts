/**
 * AudioEngine 纯逻辑测试
 *
 * 由于 react-native-audio-api 是 native 模块，无法在 Jest 环境中加载，
 * 测试集中在：
 *   1. Mock 环境下的降级（Expo Go / isAvailable=false）
 *   2. stop() 不会抛异常（幂等性）
 *   3. getSpectrumData() 在未运行时返回 null
 *   4. start() 错误处理路径（native 不可用）
 */

// Mock react-native-audio-api（native 模块在 Jest 中不可用）
jest.mock('react-native-audio-api', () => {
  throw new Error('native not available');
}, { virtual: true });

const mockSetFeedbackFrequency = jest.fn();
jest.mock('@stores/audio-store', () => ({
  useAudioStore: {
    getState: jest.fn(() => ({
      setFeedbackFrequency: mockSetFeedbackFrequency,
    })),
  },
}));

import { AudioEngine } from '@services/audio/AudioEngine';

describe('AudioEngine - Expo Go / Mock 模式', () => {
  it('isAvailable 为 false（无 native 模块）', () => {
    expect(AudioEngine.isAvailable).toBe(false);
  });

  it('start() 在 mock 模式下返回 { error: null }', async () => {
    const result = await AudioEngine.start({
      gain: 6,
      voiceEnhance: 0.6,
      noiseGate: 0.3,
      headphoneMode: 'normal' as never,
    });
    expect(result.error).toBeNull();
  });

  it('start() 后 isRunning 可通过 getSpectrumData 感知（返回 null）', async () => {
    await AudioEngine.start({
      gain: 6,
      voiceEnhance: 0.6,
      noiseGate: 0.3,
      headphoneMode: 'speaker' as never,
    });
    // mock 模式：isNativeAvailable=false → getSpectrumData 返回 null
    expect(AudioEngine.getSpectrumData()).toBeNull();
  });

  it('stop() 不抛异常（幂等）', async () => {
    await expect(AudioEngine.stop()).resolves.not.toThrow();
  });

  it('连续 stop() 两次不崩溃', async () => {
    await AudioEngine.stop();
    await expect(AudioEngine.stop()).resolves.not.toThrow();
  });

  it('未启动时 getSpectrumData() 返回 null', () => {
    expect(AudioEngine.getSpectrumData(24)).toBeNull();
  });

  it('start() → stop() 序列不报错', async () => {
    await AudioEngine.start({
      gain: 6,
      voiceEnhance: 0.5,
      noiseGate: 0.2,
      headphoneMode: 'bone_conduction' as never,
    });
    await expect(AudioEngine.stop()).resolves.not.toThrow();
  });

  it('getSpectrumData(numBars) 未运行或 Mock 下返回 null', () => {
    expect(AudioEngine.getSpectrumData(24)).toBeNull();
    expect(AudioEngine.getSpectrumData(28)).toBeNull();
  });

  it('stop() 后清除啸叫频率（setFeedbackFrequency(null)）', async () => {
    await AudioEngine.start({
      gain: 6,
      voiceEnhance: 0.5,
      noiseGate: 0.2,
      headphoneMode: 'normal' as never,
    });
    await AudioEngine.stop();
    expect(mockSetFeedbackFrequency).toHaveBeenCalledWith(null);
  });
});

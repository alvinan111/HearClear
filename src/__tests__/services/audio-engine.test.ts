/**
 * AudioEngine 纯逻辑测试
 *
 * 由于 react-native-audio-api 是 native 模块，无法在 Jest 环境中加载，
 * 测试集中在：
 *   1. Mock 环境下的降级（Expo Go / isAvailable=false）
 *   2. stop() 不会抛异常（幂等性）
 *   3. getSpectrumData() 在未运行时返回 null
 *   4. start() 错误处理路径（native 不可用）
 *   5. 语音增强：setSpeechEnhancementEnabled 抛错时引擎不崩溃（防御性 try/catch）
 *
 * 说明：真机上的 JNI 崩溃（如 setSpeechEnhancementEnabledNative 缺失）无法在 JS 单测中复现，
 * 此处通过 mock 模拟“native 方法存在但调用时抛错”，验证引擎和包层面的防御逻辑。
 */

// 设为 true 时使用 stub，否则 throw（用于“语音增强抛错”用例中让 start() 走到 setEnabled）
declare global {
  var __audioApiUseStub: boolean | undefined;
}
jest.mock('react-native-audio-api', () => {
  if (globalThis.__audioApiUseStub) {
    const noop = () => {};
    const node = () => ({ connect: noop, fftSize: 512, frequencyBinCount: 256, getFloatFrequencyData: noop, gain: { value: 1, setTargetAtTime: noop }, type: 'lowpass', frequency: { value: 0 }, Q: { value: 0.7 }, smoothingTimeConstant: 0.5, offset: { value: 0 }, start: noop, destination: {} });
    return {
      AudioContext: class {
        sampleRate = 48000;
        destination = {};
        createRecorderAdapter = () => ({ connect: noop });
        createAnalyser = () => node();
        createBiquadFilter = () => node();
        createGain = () => node();
        createConstantSource = () => node();
        resume = () => Promise.resolve();
      },
      AudioRecorder: class { connect = noop; stop = noop; start = () => ({ status: 'ok' }); },
      AudioManager: { setInputDevice: () => Promise.resolve(), setAudioSessionActivity: () => Promise.resolve(), getDevicesInfo: () => Promise.resolve([]) },
    };
  }
  throw new Error('native not available');
}, { virtual: true });

const mockSetFeedbackFrequency = jest.fn();
jest.mock('@stores/audio-store', () => ({
  useAudioStore: {
    getState: jest.fn(() => ({
      setFeedbackFrequency: mockSetFeedbackFrequency,
      params: { scene: 'default', noiseGate: 0.2 },
    })),
  },
}));

import { AudioEngine, GATE_ANALYSER_FFT } from '@services/audio/AudioEngine';

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

  it('门控分析使用 512 点 FFT（低延迟，见 native-audio-architecture.md）', () => {
    expect(GATE_ANALYSER_FFT).toBe(512);
  });

  it('start() 传入 neuralDenoiser: true 在 mock 下不报错', async () => {
    const result = await AudioEngine.start({
      gain: 6,
      voiceEnhance: 0.5,
      noiseGate: 0.2,
      headphoneMode: 'normal' as never,
      neuralDenoiser: true,
    });
    expect(result.error).toBeNull();
  });
});

describe('AudioEngine - 语音增强（setSpeechEnhancementEnabled 抛错不导致崩溃）', () => {
  beforeEach(() => {
    (globalThis as unknown as { __audioApiUseStub?: boolean }).__audioApiUseStub = true;
    jest.resetModules();
  });
  afterEach(async () => {
    try {
      const { AudioEngine } = await import('@services/audio/AudioEngine');
      await AudioEngine.stop();
    } catch { /* ignore */ }
    delete (globalThis as unknown as { __audioApiUseStub?: boolean }).__audioApiUseStub;
  });

  it('NativeModules.AudioAPIModule.setSpeechEnhancementEnabled 抛错时 start(neuralDenoiser: true) 仍正常返回', async () => {
    const { NativeModules } = await import('react-native');
    NativeModules.AudioAPIModule = {
      setSpeechEnhancementEnabled: () => {
        throw new Error('setSpeechEnhancementEnabledNative not found');
      },
    };
    const { AudioEngine } = await import('@services/audio/AudioEngine');
    const result = await AudioEngine.start({
      gain: 6,
      voiceEnhance: 0.5,
      noiseGate: 0.2,
      headphoneMode: 'normal' as never,
      neuralDenoiser: true,
    });
    expect(result.error).toBeNull();
  });

  it('NativeModules.AudioAPIModule.setSpeechEnhancementEnabled 抛错时 stop() 不抛异常', async () => {
    const { NativeModules } = await import('react-native');
    NativeModules.AudioAPIModule = {
      setSpeechEnhancementEnabled: () => {
        throw new Error('setSpeechEnhancementEnabledNative not found');
      },
    };
    const { AudioEngine } = await import('@services/audio/AudioEngine');
    await AudioEngine.start({
      gain: 6,
      voiceEnhance: 0.5,
      noiseGate: 0.2,
      headphoneMode: 'normal' as never,
      neuralDenoiser: true,
    });
    await expect(AudioEngine.stop()).resolves.not.toThrow();
  });
});

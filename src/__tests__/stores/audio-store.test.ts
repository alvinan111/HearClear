import { useAudioStore } from '@stores/audio-store';
import { AUDIO_CONFIG, HeadphoneMode } from '@config/audio';
import { getItem } from '@utils/storage';

jest.mock('@utils/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

// 每个测试前重置 store 到初始状态
beforeEach(() => {
  useAudioStore.setState({
    params: {
      gain: AUDIO_CONFIG.DEFAULT_GAIN,
      voiceEnhance: AUDIO_CONFIG.DEFAULT_VOICE_ENHANCE,
      noiseGate: AUDIO_CONFIG.DEFAULT_NOISE_GATE,
      headphoneMode: HeadphoneMode.NORMAL,
      scene: 'default',
      neuralDenoiser: true,
      audiogram: null,
      prescription: null,
      feedbackCorrection: null,
    },
    status: 'idle',
    headphoneConnected: false,
    feedbackFrequency: null,
    error: null,
    configLocked: false,
  });
});

describe('初始状态', () => {
  it('params 使用默认值', () => {
    const { params } = useAudioStore.getState();
    expect(params.gain).toBe(AUDIO_CONFIG.DEFAULT_GAIN);
    expect(params.voiceEnhance).toBe(AUDIO_CONFIG.DEFAULT_VOICE_ENHANCE);
    expect(params.noiseGate).toBe(AUDIO_CONFIG.DEFAULT_NOISE_GATE);
    expect(params.headphoneMode).toBe(HeadphoneMode.NORMAL);
    expect(params.neuralDenoiser).toBe(true);
  });

  it('初始 status 为 idle', () => {
    expect(useAudioStore.getState().status).toBe('idle');
  });

  it('初始 configLocked 为 false', () => {
    expect(useAudioStore.getState().configLocked).toBe(false);
  });
});

describe('setStatus', () => {
  it('更新 status', () => {
    useAudioStore.getState().setStatus('running');
    expect(useAudioStore.getState().status).toBe('running');
  });
});

describe('setHeadphoneConnected', () => {
  it('连接耳机', () => {
    useAudioStore.getState().setHeadphoneConnected(true);
    expect(useAudioStore.getState().headphoneConnected).toBe(true);
  });

  it('断开耳机', () => {
    useAudioStore.getState().setHeadphoneConnected(true);
    useAudioStore.getState().setHeadphoneConnected(false);
    expect(useAudioStore.getState().headphoneConnected).toBe(false);
  });
});

describe('setFeedbackFrequency', () => {
  it('设置啸叫频率', () => {
    useAudioStore.getState().setFeedbackFrequency(2000);
    expect(useAudioStore.getState().feedbackFrequency).toBe(2000);
  });

  it('清除啸叫频率', () => {
    useAudioStore.getState().setFeedbackFrequency(2000);
    useAudioStore.getState().setFeedbackFrequency(null);
    expect(useAudioStore.getState().feedbackFrequency).toBeNull();
  });
});

describe('setError', () => {
  it('设置错误信息', () => {
    useAudioStore.getState().setError({ code: 'PERMISSION_DENIED', message: '麦克风权限被拒绝' });
    expect(useAudioStore.getState().error?.code).toBe('PERMISSION_DENIED');
  });

  it('清除错误', () => {
    useAudioStore.getState().setError({ code: 'ENGINE_ERROR', message: 'test' });
    useAudioStore.getState().setError(null);
    expect(useAudioStore.getState().error).toBeNull();
  });
});

describe('updateParams', () => {
  it('正常更新 gain', () => {
    useAudioStore.getState().updateParams({ gain: 10 });
    expect(useAudioStore.getState().params.gain).toBe(10);
  });

  it('partial 更新不影响其他字段', () => {
    useAudioStore.getState().updateParams({ gain: 8 });
    const { params } = useAudioStore.getState();
    expect(params.voiceEnhance).toBe(AUDIO_CONFIG.DEFAULT_VOICE_ENHANCE);
    expect(params.noiseGate).toBe(AUDIO_CONFIG.DEFAULT_NOISE_GATE);
  });

  it('切换耳机模式', () => {
    useAudioStore.getState().updateParams({ headphoneMode: HeadphoneMode.BONE_CONDUCTION });
    expect(useAudioStore.getState().params.headphoneMode).toBe(HeadphoneMode.BONE_CONDUCTION);
  });

  it('configLocked 时禁止修改参数', () => {
    useAudioStore.getState().setConfigLocked(true);
    useAudioStore.getState().updateParams({ gain: 20 });
    expect(useAudioStore.getState().params.gain).toBe(AUDIO_CONFIG.DEFAULT_GAIN);
  });

  it('configLocked 时禁止修改 neuralDenoiser', () => {
    useAudioStore.getState().setConfigLocked(true);
    useAudioStore.getState().updateParams({ neuralDenoiser: false });
    expect(useAudioStore.getState().params.neuralDenoiser).toBe(true);
  });

  it('可单独更新 noiseGate、voiceEnhance', () => {
    useAudioStore.getState().updateParams({ noiseGate: 0.5 });
    expect(useAudioStore.getState().params.noiseGate).toBe(0.5);
    useAudioStore.getState().updateParams({ voiceEnhance: 0.8 });
    expect(useAudioStore.getState().params.voiceEnhance).toBe(0.8);
  });

  it('可单独更新 neuralDenoiser', () => {
    useAudioStore.getState().updateParams({ neuralDenoiser: false });
    expect(useAudioStore.getState().params.neuralDenoiser).toBe(false);
    useAudioStore.getState().updateParams({ neuralDenoiser: true });
    expect(useAudioStore.getState().params.neuralDenoiser).toBe(true);
  });

  it('updateParams 多次合并保留最后一次', () => {
    useAudioStore.getState().updateParams({ gain: 5 });
    useAudioStore.getState().updateParams({ gain: 10 });
    expect(useAudioStore.getState().params.gain).toBe(10);
  });
});

describe('resetParams', () => {
  it('恢复到默认参数', () => {
    useAudioStore.getState().updateParams({ gain: 15, voiceEnhance: 0.9 });
    useAudioStore.getState().resetParams();
    const { params } = useAudioStore.getState();
    expect(params.gain).toBe(AUDIO_CONFIG.DEFAULT_GAIN);
    expect(params.voiceEnhance).toBe(AUDIO_CONFIG.DEFAULT_VOICE_ENHANCE);
  });

  it('resetParams 将 neuralDenoiser 恢复为默认 true', () => {
    useAudioStore.getState().updateParams({ neuralDenoiser: false });
    useAudioStore.getState().resetParams();
    expect(useAudioStore.getState().params.neuralDenoiser).toBe(true);
  });

  it('configLocked 时禁止重置', () => {
    useAudioStore.getState().updateParams({ gain: 15 });
    useAudioStore.getState().setConfigLocked(true);
    useAudioStore.getState().resetParams();
    expect(useAudioStore.getState().params.gain).toBe(15);
  });
});

describe('setConfigLocked', () => {
  it('锁定配置', () => {
    useAudioStore.getState().setConfigLocked(true);
    expect(useAudioStore.getState().configLocked).toBe(true);
  });

  it('解锁配置后可以修改参数', () => {
    useAudioStore.getState().setConfigLocked(true);
    useAudioStore.getState().setConfigLocked(false);
    useAudioStore.getState().updateParams({ gain: 12 });
    expect(useAudioStore.getState().params.gain).toBe(12);
  });
});

describe('setAudiogramAndPrescription', () => {
  it('设置听力图与处方', () => {
    const audiogram = { 250: 10, 500: 15, 1000: 20, 2000: 25, 4000: 30, 8000: 35 };
    const prescription = { 100: 2, 250: 4, 800: 6, 1000: 8, 2500: 10, 4000: 12, 8000: 14 };
    useAudioStore.getState().setAudiogramAndPrescription(audiogram, prescription);
    expect(useAudioStore.getState().params.audiogram).toEqual(audiogram);
    expect(useAudioStore.getState().params.prescription).toEqual(prescription);
  });

  it('可清空为 null', () => {
    useAudioStore.getState().setAudiogramAndPrescription({ 250: 5, 500: 5, 1000: 5, 2000: 5, 4000: 5, 8000: 5 }, null);
    useAudioStore.getState().setAudiogramAndPrescription(null, null);
    expect(useAudioStore.getState().params.audiogram).toBeNull();
    expect(useAudioStore.getState().params.prescription).toBeNull();
  });
});

describe('updateFeedbackCorrection', () => {
  it('合并 overall 修正', () => {
    useAudioStore.getState().updateFeedbackCorrection({ overall: -2 });
    expect(useAudioStore.getState().params.feedbackCorrection?.overall).toBe(-2);
  });

  it('合并 low/mid/high', () => {
    useAudioStore.getState().updateFeedbackCorrection({ low: 1, mid: 0, high: -1 });
    expect(useAudioStore.getState().params.feedbackCorrection?.low).toBe(1);
    expect(useAudioStore.getState().params.feedbackCorrection?.mid).toBe(0);
    expect(useAudioStore.getState().params.feedbackCorrection?.high).toBe(-1);
  });

  it('多次合并保留后者', () => {
    useAudioStore.getState().updateFeedbackCorrection({ overall: 2 });
    useAudioStore.getState().updateFeedbackCorrection({ overall: -1 });
    expect(useAudioStore.getState().params.feedbackCorrection?.overall).toBe(-1);
  });
});

describe('hydrateFromStorage', () => {
  it('从存储加载合法数据时合并到 params', async () => {
    (getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'hearclear:audiogram') return Promise.resolve({ 250: 5, 500: 10, 1000: 15, 2000: 20, 4000: 25, 8000: 30 });
      if (key === 'hearclear:prescription') return Promise.resolve({ 100: 1, 250: 2, 800: 3, 1000: 4, 2500: 5, 4000: 6, 8000: 7 });
      if (key === 'hearclear:feedback_correction') return Promise.resolve({ overall: -1, low: 0, mid: 0, high: 0 });
      return Promise.resolve(null);
    });
    await useAudioStore.getState().hydrateFromStorage();
    expect(useAudioStore.getState().params.audiogram).toEqual({ 250: 5, 500: 10, 1000: 15, 2000: 20, 4000: 25, 8000: 30 });
    expect(useAudioStore.getState().params.prescription).toEqual({ 100: 1, 250: 2, 800: 3, 1000: 4, 2500: 5, 4000: 6, 8000: 7 });
    expect(useAudioStore.getState().params.feedbackCorrection?.overall).toBe(-1);
  });
});

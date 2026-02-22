/**
 * 音频配置常量和 AUDIO_PRESETS 测试
 *
 * 验证配置值在合理范围内，防止误改导致音质问题。
 */

import { AUDIO_CONFIG, AUDIO_PRESETS, HeadphoneMode } from '@config/audio';

describe('AUDIO_CONFIG 基础值', () => {
  it('DEFAULT_GAIN 在合理范围（0-36 dB）', () => {
    expect(AUDIO_CONFIG.DEFAULT_GAIN).toBeGreaterThanOrEqual(0);
    expect(AUDIO_CONFIG.DEFAULT_GAIN).toBeLessThanOrEqual(36);
  });

  it('MAX_GAIN_NORMAL > MAX_GAIN_BONE_CONDUCTION > MAX_GAIN_SPEAKER（防止外放啸叫）', () => {
    expect(AUDIO_CONFIG.MAX_GAIN_NORMAL).toBeGreaterThan(AUDIO_CONFIG.MAX_GAIN_BONE_CONDUCTION);
    expect(AUDIO_CONFIG.MAX_GAIN_BONE_CONDUCTION).toBeGreaterThan(AUDIO_CONFIG.MAX_GAIN_SPEAKER);
  });

  it('DEFAULT_VOICE_ENHANCE 在 [0, 1] 范围', () => {
    expect(AUDIO_CONFIG.DEFAULT_VOICE_ENHANCE).toBeGreaterThanOrEqual(0);
    expect(AUDIO_CONFIG.DEFAULT_VOICE_ENHANCE).toBeLessThanOrEqual(1);
  });

  it('DEFAULT_NOISE_GATE 在 [0, 1] 范围', () => {
    expect(AUDIO_CONFIG.DEFAULT_NOISE_GATE).toBeGreaterThanOrEqual(0);
    expect(AUDIO_CONFIG.DEFAULT_NOISE_GATE).toBeLessThanOrEqual(1);
  });

  it('SAMPLE_RATE 为标准值 44100', () => {
    expect(AUDIO_CONFIG.SAMPLE_RATE).toBe(44100);
  });
});

describe('AUDIO_CONFIG.EQ_BANDS', () => {
  it('包含至少 4 个滤波器', () => {
    expect(AUDIO_CONFIG.EQ_BANDS.length).toBeGreaterThanOrEqual(4);
  });

  it('每个滤波器都有 type/frequency/gain/q', () => {
    for (const band of AUDIO_CONFIG.EQ_BANDS) {
      expect(band.type).toBeTruthy();
      expect(band.frequency).toBeGreaterThan(0);
      expect(typeof band.gain).toBe('number');
      expect(band.q).toBeGreaterThan(0);
    }
  });

  it('滤波器频率按升序排列（低频到高频）', () => {
    const freqs = AUDIO_CONFIG.EQ_BANDS.map(b => b.frequency);
    for (let i = 1; i < freqs.length; i++) {
      expect(freqs[i]).toBeGreaterThan(freqs[i - 1]);
    }
  });
});

describe('AUDIO_CONFIG.FEEDBACK_SUPPRESSOR', () => {
  it('THRESHOLD_DB 大于 0（防止误触发）', () => {
    expect(AUDIO_CONFIG.FEEDBACK_SUPPRESSOR.THRESHOLD_DB).toBeGreaterThan(0);
  });

  it('骨传导检测窗口比普通模式更短（响应更快）', () => {
    expect(AUDIO_CONFIG.FEEDBACK_SUPPRESSOR.DETECTION_WINDOW_BONE)
      .toBeLessThan(AUDIO_CONFIG.FEEDBACK_SUPPRESSOR.DETECTION_WINDOW_NORMAL);
  });

  it('NOTCH_Q 大于 0', () => {
    expect(AUDIO_CONFIG.FEEDBACK_SUPPRESSOR.NOTCH_Q).toBeGreaterThan(0);
  });

  it('AUTO_GAIN_REDUCTION 大于 0', () => {
    expect(AUDIO_CONFIG.FEEDBACK_SUPPRESSOR.AUTO_GAIN_REDUCTION).toBeGreaterThan(0);
  });
});

describe('AUDIO_PRESETS', () => {
  it('三种模式的预设都存在', () => {
    expect(AUDIO_PRESETS[HeadphoneMode.NORMAL]).toBeDefined();
    expect(AUDIO_PRESETS[HeadphoneMode.BONE_CONDUCTION]).toBeDefined();
    expect(AUDIO_PRESETS[HeadphoneMode.SPEAKER]).toBeDefined();
  });

  it('NORMAL 模式 useSpeaker=false', () => {
    expect(AUDIO_PRESETS[HeadphoneMode.NORMAL].useSpeaker).toBe(false);
  });

  it('SPEAKER 模式 useSpeaker=true', () => {
    expect(AUDIO_PRESETS[HeadphoneMode.SPEAKER].useSpeaker).toBe(true);
  });

  it('BONE_CONDUCTION 有额外 EQ 补偿（骨传导低频不足）', () => {
    expect(AUDIO_PRESETS[HeadphoneMode.BONE_CONDUCTION].extraEQ).toBeDefined();
  });

  it('SPEAKER 有 extraEQ（外放削减低频防回声）', () => {
    expect(AUDIO_PRESETS[HeadphoneMode.SPEAKER].extraEQ).toBeDefined();
  });

  it('各模式 maxGain 不超过 AUDIO_CONFIG 上限', () => {
    expect(AUDIO_PRESETS[HeadphoneMode.NORMAL].maxGain).toBe(AUDIO_CONFIG.MAX_GAIN_NORMAL);
    expect(AUDIO_PRESETS[HeadphoneMode.BONE_CONDUCTION].maxGain).toBe(AUDIO_CONFIG.MAX_GAIN_BONE_CONDUCTION);
    expect(AUDIO_PRESETS[HeadphoneMode.SPEAKER].maxGain).toBe(AUDIO_CONFIG.MAX_GAIN_SPEAKER);
  });

  it('SPEAKER 模式 AEC 强度最高（外放回声最严重）', () => {
    expect(AUDIO_PRESETS[HeadphoneMode.SPEAKER].aecStrength)
      .toBeGreaterThanOrEqual(AUDIO_PRESETS[HeadphoneMode.BONE_CONDUCTION].aecStrength);
  });
});

describe('HeadphoneMode 枚举', () => {
  it('包含三个合法值', () => {
    expect(HeadphoneMode.NORMAL).toBe('normal');
    expect(HeadphoneMode.BONE_CONDUCTION).toBe('bone_conduction');
    expect(HeadphoneMode.SPEAKER).toBe('speaker');
  });
});

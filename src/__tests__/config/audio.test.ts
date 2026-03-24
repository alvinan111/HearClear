/**
 * 音频配置常量和 AUDIO_PRESETS 测试
 *
 * 验证配置值在合理范围内，防止误改导致音质问题。
 */

import { AUDIO_CONFIG, AUDIO_PRESETS, HeadphoneMode, OUTPUT_DEVICE_OPTIONS } from '@config/audio';

describe('AUDIO_CONFIG 基础值', () => {
  it('DEFAULT_GAIN 在合理范围（0-38 dB）', () => {
    expect(AUDIO_CONFIG.DEFAULT_GAIN).toBeGreaterThanOrEqual(0);
    expect(AUDIO_CONFIG.DEFAULT_GAIN).toBeLessThanOrEqual(38);
  });

  it('MAX_GAIN_NORMAL > MAX_GAIN_BONE_CONDUCTION > MAX_GAIN_SPEAKER（防止外放啸叫）', () => {
    expect(AUDIO_CONFIG.MAX_GAIN_NORMAL).toBeGreaterThan(AUDIO_CONFIG.MAX_GAIN_BONE_CONDUCTION);
    expect(AUDIO_CONFIG.MAX_GAIN_BONE_CONDUCTION).toBeGreaterThan(AUDIO_CONFIG.MAX_GAIN_SPEAKER);
  });

  it('AUDIO_CONFIG.DEFAULT_GAIN 不可过高（防止反馈爆炸）', () => {
    expect(AUDIO_CONFIG.DEFAULT_GAIN).toBeLessThanOrEqual(10);
  });

  it('FEEDBACK_SUPPRESSOR 预防性 Notch 趋于安全', () => {
    expect(AUDIO_CONFIG.FEEDBACK_SUPPRESSOR.PREVENTIVE_NOTCHES.length).toBeGreaterThanOrEqual(5);
    for (const n of AUDIO_CONFIG.FEEDBACK_SUPPRESSOR.PREVENTIVE_NOTCHES) {
      expect(n.gain).toBeLessThanOrEqual(-2);
      expect(n.q).toBeGreaterThanOrEqual(0.8);
    }
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

  it('检测窗口大于 0', () => {
    expect(AUDIO_CONFIG.FEEDBACK_SUPPRESSOR.DETECTION_WINDOW_MS).toBeGreaterThan(0);
  });

  it('NOTCH_Q 大于 0', () => {
    expect(AUDIO_CONFIG.FEEDBACK_SUPPRESSOR.NOTCH_Q).toBeGreaterThan(0);
  });

  it('NOTCH_COUNT 至少 1', () => {
    expect(AUDIO_CONFIG.FEEDBACK_SUPPRESSOR.NOTCH_COUNT).toBeGreaterThanOrEqual(1);
  });

  it('LIMITER_GAIN_REDUCTION 在 (0,1]', () => {
    expect(AUDIO_CONFIG.FEEDBACK_SUPPRESSOR.LIMITER_GAIN_REDUCTION).toBeGreaterThan(0);
    expect(AUDIO_CONFIG.FEEDBACK_SUPPRESSOR.LIMITER_GAIN_REDUCTION).toBeLessThanOrEqual(1);
  });
});

describe('AUDIO_CONFIG.GATE', () => {
  it('UPDATE_MS 在 10–100ms（门控周期，影响延迟）', () => {
    expect(AUDIO_CONFIG.GATE.UPDATE_MS).toBeGreaterThanOrEqual(10);
    expect(AUDIO_CONFIG.GATE.UPDATE_MS).toBeLessThanOrEqual(100);
  });

  it('ATTACK_MS 与 RELEASE_MS 为正数', () => {
    expect(AUDIO_CONFIG.GATE.ATTACK_MS).toBeGreaterThan(0);
    expect(AUDIO_CONFIG.GATE.RELEASE_MS).toBeGreaterThan(0);
  });

  it('SOFT_ENABLED 为布尔', () => {
    expect(typeof AUDIO_CONFIG.GATE.SOFT_ENABLED).toBe('boolean');
  });
});

describe('AUDIO_CONFIG.SCENE_PRESETS', () => {
  it('default 与 tv 预设都存在', () => {
    expect(AUDIO_CONFIG.SCENE_PRESETS.default).toBeDefined();
    expect(AUDIO_CONFIG.SCENE_PRESETS.tv).toBeDefined();
  });

  it('各预设含 gateUpdateMs / gateAttackMs / gateReleaseMs / thresholdBase / thresholdScale', () => {
    for (const key of ['default', 'tv'] as const) {
      const p = AUDIO_CONFIG.SCENE_PRESETS[key];
      expect(p.gateUpdateMs).toBeGreaterThan(0);
      expect(p.gateAttackMs).toBeGreaterThan(0);
      expect(p.gateReleaseMs).toBeGreaterThan(0);
      expect(p.thresholdBase).toBeGreaterThanOrEqual(0);
      expect(p.thresholdScale).toBeGreaterThanOrEqual(0);
    }
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

  it('OUTPUT_DEVICE_OPTIONS 中的模式均为 useSpeaker false（防止误开外放）', () => {
    for (const mode of OUTPUT_DEVICE_OPTIONS) {
      expect(AUDIO_PRESETS[mode].useSpeaker).toBe(false);
    }
  });
});

describe('HeadphoneMode 枚举', () => {
  it('包含三个合法值', () => {
    expect(HeadphoneMode.NORMAL).toBe('normal');
    expect(HeadphoneMode.BONE_CONDUCTION).toBe('bone_conduction');
    expect(HeadphoneMode.SPEAKER).toBe('speaker');
  });
});

describe('AUDIO_CONFIG 默认参数', () => {
  it('DEFAULT_NOISE_GATE 在 [0,1] 且偏大（环境音压得低）', () => {
    expect(AUDIO_CONFIG.DEFAULT_NOISE_GATE).toBeGreaterThanOrEqual(0);
    expect(AUDIO_CONFIG.DEFAULT_NOISE_GATE).toBeLessThanOrEqual(1);
    expect(AUDIO_CONFIG.DEFAULT_NOISE_GATE).toBeGreaterThanOrEqual(0.5);
  });

  it('DEFAULT_VOICE_ENHANCE 在 [0,1]', () => {
    expect(AUDIO_CONFIG.DEFAULT_VOICE_ENHANCE).toBeGreaterThanOrEqual(0);
    expect(AUDIO_CONFIG.DEFAULT_VOICE_ENHANCE).toBeLessThanOrEqual(1);
  });
});

describe('OUTPUT_DEVICE_OPTIONS', () => {
  it('仅包含 NORMAL 与 BONE_CONDUCTION，不含 SPEAKER（UI 无外放选项）', () => {
    expect(OUTPUT_DEVICE_OPTIONS).toContain(HeadphoneMode.NORMAL);
    expect(OUTPUT_DEVICE_OPTIONS).toContain(HeadphoneMode.BONE_CONDUCTION);
    expect(OUTPUT_DEVICE_OPTIONS).not.toContain(HeadphoneMode.SPEAKER);
    expect(OUTPUT_DEVICE_OPTIONS).toHaveLength(2);
  });

});

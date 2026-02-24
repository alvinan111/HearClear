/**
 * 音频工具纯函数测试，防止增益裁剪与 dB 换算被改坏。
 */

import { clampGainForPreset, dbToLinear } from '@services/audio/audioUtils';
import { AUDIO_CONFIG, AUDIO_PRESETS, HeadphoneMode } from '@config/audio';

describe('clampGainForPreset', () => {
  it('gain 超过 maxGain 时返回 maxGain', () => {
    expect(clampGainForPreset(40, 38)).toBe(38);
    expect(clampGainForPreset(30, 26)).toBe(26);
  });

  it('gain 在 [0, maxGain] 内时原样返回', () => {
    expect(clampGainForPreset(10, 38)).toBe(10);
    expect(clampGainForPreset(0, 38)).toBe(0);
    expect(clampGainForPreset(38, 38)).toBe(38);
  });

  it('gain 小于 0 时返回 0', () => {
    expect(clampGainForPreset(-1, 38)).toBe(0);
    expect(clampGainForPreset(-10, 26)).toBe(0);
  });

  it('与各 preset.maxGain 组合时不会超出预设', () => {
    const gain = 100; // 远超任意预设
    expect(clampGainForPreset(gain, AUDIO_PRESETS[HeadphoneMode.NORMAL].maxGain))
      .toBe(AUDIO_CONFIG.MAX_GAIN_NORMAL);
    expect(clampGainForPreset(gain, AUDIO_PRESETS[HeadphoneMode.BONE_CONDUCTION].maxGain))
      .toBe(AUDIO_CONFIG.MAX_GAIN_BONE_CONDUCTION);
    expect(clampGainForPreset(gain, AUDIO_PRESETS[HeadphoneMode.SPEAKER].maxGain))
      .toBe(AUDIO_CONFIG.MAX_GAIN_SPEAKER);
  });
});

describe('dbToLinear', () => {
  it('0 dB 为 1', () => {
    expect(dbToLinear(0)).toBe(1);
  });

  it('6 dB 约为 2', () => {
    expect(dbToLinear(6)).toBeCloseTo(2, 2);
  });

  it('负 dB 小于 1', () => {
    expect(dbToLinear(-6)).toBeLessThan(1);
    expect(dbToLinear(-6)).toBeGreaterThan(0);
  });
});

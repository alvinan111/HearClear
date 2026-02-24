/**
 * 纯函数工具，便于单测覆盖引擎中的增益与换算逻辑。
 */

/** 将 gain 限制在 [0, maxGain] 内，供引擎使用 preset.maxGain 时调用 */
export function clampGainForPreset(gain: number, maxGain: number): number {
  return Math.min(Math.max(0, gain), maxGain);
}

/** dB 转线性增益 */
export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

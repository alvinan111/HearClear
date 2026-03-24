/**
 * 处方计算：听力图 → EQ 频带增益（半增益简化）
 * G(f) = k * HL(f)，k ≈ 0.4–0.5；6 点插值到 7 个 EQ 频带
 */

import type { Audiogram, Prescription } from '@/types/audiogram';
import { PRESCRIPTION_BAND_FREQS } from '@/types/audiogram';
import { AUDIOGRAM_FREQUENCIES } from '@/types/audiogram';

/** 半增益系数，0.4–0.5 */
const HALF_GAIN_K = 0.45;

/**
 * 线性插值：在数组 xs（升序）对应的 ys 中取 x 对应的 y
 */
function interp1(xs: number[], ys: number[], x: number): number {
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  let i = 0;
  while (i < xs.length - 1 && xs[i + 1] < x) i++;
  const x0 = xs[i];
  const x1 = xs[i + 1];
  const y0 = ys[i];
  const y1 = ys[i + 1];
  const t = (x - x0) / (x1 - x0);
  return y0 + t * (y1 - y0);
}

/**
 * 从听力图计算处方：半增益 + 6 频率插值到 7 个 EQ 频带
 */
export function audiogramToPrescription(audiogram: Audiogram): Prescription {
  const xs = [...AUDIOGRAM_FREQUENCIES];
  const losses = xs.map((f) => audiogram[f]);
  const gains = losses.map((hl) => HALF_GAIN_K * Math.max(0, hl));

  const out: Record<number, number> = {};
  for (const bandFreq of PRESCRIPTION_BAND_FREQS) {
    out[bandFreq] = interp1(xs, gains, bandFreq);
  }
  return out as Prescription;
}

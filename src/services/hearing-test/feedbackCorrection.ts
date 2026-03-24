/**
 * 反馈修正：限幅、持久化
 */

import { setItem, getItem } from '@utils/storage';
import { STORAGE_KEYS } from '@constants/trial';
import type { FeedbackCorrection } from '@/types/audiogram';
import { DEFAULT_FEEDBACK_CORRECTION, isFeedbackCorrection } from '@/types/audiogram';

const OVERALL_MAX = 6;
const BAND_MAX = 6;

function clamp(v: number, max: number): number {
  return Math.max(-max, Math.min(max, v));
}

/**
 * 应用限幅：overall ±6 dB，low/mid/high ±6 dB
 */
export function clampFeedbackCorrection(fc: FeedbackCorrection): FeedbackCorrection {
  return {
    overall: clamp(fc.overall, OVERALL_MAX),
    low: fc.low !== undefined ? clamp(fc.low, BAND_MAX) : 0,
    mid: fc.mid !== undefined ? clamp(fc.mid, BAND_MAX) : 0,
    high: fc.high !== undefined ? clamp(fc.high, BAND_MAX) : 0,
  };
}

/**
 * 持久化反馈修正到 AsyncStorage
 */
export async function persistFeedbackCorrection(fc: FeedbackCorrection): Promise<void> {
  await setItem(STORAGE_KEYS.FEEDBACK_CORRECTION, clampFeedbackCorrection(fc));
}

/**
 * 从 AsyncStorage 读取反馈修正（audio-store 启动时已通过 hydrateFromStorage 加载，此方法供单独读取用）
 */
export async function loadFeedbackCorrection(): Promise<FeedbackCorrection> {
  const raw = await getItem<unknown>(STORAGE_KEYS.FEEDBACK_CORRECTION);
  if (isFeedbackCorrection(raw)) {
    return { ...DEFAULT_FEEDBACK_CORRECTION, ...raw };
  }
  return { ...DEFAULT_FEEDBACK_CORRECTION };
}

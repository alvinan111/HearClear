/**
 * 听力图与处方类型
 * 听力测试输出相对设备 dB，非校准 dB HL；处方为各 EQ 频带的目标增益（dB）
 */

/** 测听频率（Hz） */
export const AUDIOGRAM_FREQUENCIES = [250, 500, 1000, 2000, 4000, 8000] as const;
export type AudiogramFrequency = (typeof AUDIOGRAM_FREQUENCIES)[number];

/** 听力图：各频率的听阈（dB，相对设备） */
export type Audiogram = Record<AudiogramFrequency, number>;

/** 处方频带与 EQ_BANDS 对应：100, 250, 800, 1000, 2500, 4000, 8000 Hz */
export const PRESCRIPTION_BAND_FREQS = [100, 250, 800, 1000, 2500, 4000, 8000] as const;
export type PrescriptionBandFreq = (typeof PRESCRIPTION_BAND_FREQS)[number];

/** 处方：每个频带的目标增益调整（dB） */
export type Prescription = Record<PrescriptionBandFreq, number>;

/** 反馈修正：整体 + 可选分频段（dB） */
export interface FeedbackCorrection {
  /** 整体增益修正（dB），如 -2 表示整体减 2dB */
  overall: number;
  /** 低频修正（约 100–500 Hz），可选 */
  low?: number;
  /** 中频修正（约 500–2k Hz），可选 */
  mid?: number;
  /** 高频修正（约 2k–8k Hz），可选 */
  high?: number;
}

/** 创建空听力图（未测试用 0 或 NaN 表示） */
export function createEmptyAudiogram(): Audiogram {
  return {
    250: 0,
    500: 0,
    1000: 0,
    2000: 0,
    4000: 0,
    8000: 0,
  };
}

/** 创建零处方 */
export function createEmptyPrescription(): Prescription {
  return {
    100: 0,
    250: 0,
    800: 0,
    1000: 0,
    2500: 0,
    4000: 0,
    8000: 0,
  };
}

/** 默认无修正 */
export const DEFAULT_FEEDBACK_CORRECTION: FeedbackCorrection = {
  overall: 0,
  low: 0,
  mid: 0,
  high: 0,
};

/** 校验是否为合法听力图（含所有测听频率键） */
export function isAudiogram(v: unknown): v is Audiogram {
  if (!v || typeof v !== 'object') return false;
  for (const f of AUDIOGRAM_FREQUENCIES) {
    if (!(f in (v as object)) || typeof (v as Audiogram)[f] !== 'number') return false;
  }
  return true;
}

/** 校验是否为合法处方（含所有处方频带键） */
export function isPrescription(v: unknown): v is Prescription {
  if (!v || typeof v !== 'object') return false;
  for (const f of PRESCRIPTION_BAND_FREQS) {
    if (!(f in (v as object)) || typeof (v as Prescription)[f] !== 'number') return false;
  }
  return true;
}

/** 校验是否为合法反馈修正（至少含 overall） */
export function isFeedbackCorrection(v: unknown): v is FeedbackCorrection {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.overall === 'number';
}

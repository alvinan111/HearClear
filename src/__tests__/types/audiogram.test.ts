/**
 * 听力图与处方类型、校验函数
 */
import {
  AUDIOGRAM_FREQUENCIES,
  PRESCRIPTION_BAND_FREQS,
  createEmptyAudiogram,
  createEmptyPrescription,
  DEFAULT_FEEDBACK_CORRECTION,
  isAudiogram,
  isPrescription,
  isFeedbackCorrection,
} from '@types/audiogram';

describe('AUDIOGRAM_FREQUENCIES / PRESCRIPTION_BAND_FREQS', () => {
  it('测听频率为 6 个', () => {
    expect(AUDIOGRAM_FREQUENCIES).toEqual([250, 500, 1000, 2000, 4000, 8000]);
  });

  it('处方频带为 7 个', () => {
    expect(PRESCRIPTION_BAND_FREQS).toEqual([100, 250, 800, 1000, 2500, 4000, 8000]);
  });
});

describe('createEmptyAudiogram', () => {
  it('包含所有测听频率且值为 0', () => {
    const a = createEmptyAudiogram();
    for (const f of AUDIOGRAM_FREQUENCIES) {
      expect(a[f]).toBe(0);
    }
  });
});

describe('createEmptyPrescription', () => {
  it('包含所有处方频带且值为 0', () => {
    const p = createEmptyPrescription();
    for (const f of PRESCRIPTION_BAND_FREQS) {
      expect(p[f]).toBe(0);
    }
  });
});

describe('DEFAULT_FEEDBACK_CORRECTION', () => {
  it('overall/low/mid/high 均为 0', () => {
    expect(DEFAULT_FEEDBACK_CORRECTION.overall).toBe(0);
    expect(DEFAULT_FEEDBACK_CORRECTION.low).toBe(0);
    expect(DEFAULT_FEEDBACK_CORRECTION.mid).toBe(0);
    expect(DEFAULT_FEEDBACK_CORRECTION.high).toBe(0);
  });
});

describe('isAudiogram', () => {
  it('合法听力图返回 true', () => {
    expect(isAudiogram(createEmptyAudiogram())).toBe(true);
    expect(isAudiogram({ 250: 10, 500: 20, 1000: 30, 2000: 40, 4000: 50, 8000: 60 })).toBe(true);
  });

  it('缺键或非数字返回 false', () => {
    expect(isAudiogram(null)).toBe(false);
    expect(isAudiogram(undefined)).toBe(false);
    expect(isAudiogram({ 250: 10 })).toBe(false);
    expect(isAudiogram({ 250: '10', 500: 0, 1000: 0, 2000: 0, 4000: 0, 8000: 0 })).toBe(false);
  });
});

describe('isPrescription', () => {
  it('合法处方返回 true', () => {
    expect(isPrescription(createEmptyPrescription())).toBe(true);
    expect(isPrescription({ 100: 1, 250: 2, 800: 3, 1000: 4, 2500: 5, 4000: 6, 8000: 7 })).toBe(true);
  });

  it('缺键或非数字返回 false', () => {
    expect(isPrescription(null)).toBe(false);
    expect(isPrescription({ 100: 0 })).toBe(false);
    expect(isPrescription({ 100: '0', 250: 0, 800: 0, 1000: 0, 2500: 0, 4000: 0, 8000: 0 })).toBe(false);
  });
});

describe('isFeedbackCorrection', () => {
  it('含 overall 数字返回 true', () => {
    expect(isFeedbackCorrection(DEFAULT_FEEDBACK_CORRECTION)).toBe(true);
    expect(isFeedbackCorrection({ overall: -2 })).toBe(true);
    expect(isFeedbackCorrection({ overall: 0, low: 1 })).toBe(true);
  });

  it('无 overall 或非数字返回 false', () => {
    expect(isFeedbackCorrection(null)).toBe(false);
    expect(isFeedbackCorrection({})).toBe(false);
    expect(isFeedbackCorrection({ overall: '0' })).toBe(false);
  });
});

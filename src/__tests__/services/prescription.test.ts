/**
 * 处方计算：audiogramToPrescription 半增益 + 插值
 */
import { audiogramToPrescription } from '@services/hearing-test/prescription';
import { PRESCRIPTION_BAND_FREQS } from '@/types/audiogram';

describe('audiogramToPrescription', () => {
  it('平坦听力图（全 0）得到全 0 处方', () => {
    const audiogram = { 250: 0, 500: 0, 1000: 0, 2000: 0, 4000: 0, 8000: 0 };
    const p = audiogramToPrescription(audiogram);
    for (const f of PRESCRIPTION_BAND_FREQS) {
      expect(p[f]).toBe(0);
    }
  });

  it('单频损失 40 dB 时该频带附近有正增益', () => {
    const audiogram = { 250: 0, 500: 0, 1000: 40, 2000: 0, 4000: 0, 8000: 0 };
    const p = audiogramToPrescription(audiogram);
    expect(p[1000]).toBeGreaterThan(0);
    expect(p[800]).toBeGreaterThan(0);
    // 1000 Hz 有损失，相邻 800/1000 频带应有正增益；2500 离得远可能插值为 0
    expect(p[1000]).toBeCloseTo(0.45 * 40, 0);
  });

  it('高频损失 60 dB 时 8k 频带增益最大', () => {
    const audiogram = { 250: 0, 500: 0, 1000: 0, 2000: 20, 4000: 40, 8000: 60 };
    const p = audiogramToPrescription(audiogram);
    expect(p[8000]).toBeGreaterThan(p[4000]);
    expect(p[4000]).toBeGreaterThan(p[2500]);
  });

  it('负损失（超听）不产生负增益，按 0 处理', () => {
    const audiogram = { 250: -10, 500: -10, 1000: -10, 2000: -10, 4000: -10, 8000: -10 };
    const p = audiogramToPrescription(audiogram);
    for (const f of PRESCRIPTION_BAND_FREQS) {
      expect(p[f]).toBe(0);
    }
  });

  it('输出包含全部 7 个处方频带', () => {
    const audiogram = { 250: 10, 500: 20, 1000: 30, 2000: 25, 4000: 20, 8000: 15 };
    const p = audiogramToPrescription(audiogram);
    expect(Object.keys(p).length).toBe(7);
    for (const f of PRESCRIPTION_BAND_FREQS) {
      expect(p[f]).toBeDefined();
      expect(typeof p[f]).toBe('number');
    }
  });
});

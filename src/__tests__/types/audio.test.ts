/**
 * 音频类型：AudioParams、AudioScene、AudioError 等
 */
import type { AudioParams, AudioScene, AudioError, AudioEngineStatus } from '@types/audio';
import { HeadphoneMode } from '@config/audio';

describe('AudioParams', () => {
  it('必填字段：gain、voiceEnhance、noiseGate、headphoneMode', () => {
    const p: AudioParams = {
      gain: 10,
      voiceEnhance: 0.5,
      noiseGate: 0.3,
      headphoneMode: HeadphoneMode.NORMAL,
    };
    expect(p.gain).toBe(10);
    expect(p.headphoneMode).toBe('normal');
  });

  it('可选 neuralDenoiser 为 boolean，默认语义为 false', () => {
    const withOff: AudioParams = {
      gain: 6,
      voiceEnhance: 0.5,
      noiseGate: 0.2,
      headphoneMode: HeadphoneMode.NORMAL,
      neuralDenoiser: false,
    };
    const withOn: AudioParams = {
      ...withOff,
      neuralDenoiser: true,
    };
    expect(withOff.neuralDenoiser).toBe(false);
    expect(withOn.neuralDenoiser).toBe(true);
  });

  it('可选 scene 为 default | tv', () => {
    const p: AudioParams = {
      gain: 6,
      voiceEnhance: 0.5,
      noiseGate: 0.2,
      headphoneMode: HeadphoneMode.NORMAL,
      scene: 'tv',
    };
    expect(p.scene).toBe('tv');
  });
});

describe('AudioScene', () => {
  it('合法值为 default 与 tv', () => {
    const scenes: AudioScene[] = ['default', 'tv'];
    expect(scenes).toContain('default');
    expect(scenes).toContain('tv');
    expect(scenes).toHaveLength(2);
  });
});

describe('AudioError', () => {
  it('code 为已知错误码之一', () => {
    const codes: AudioError['code'][] = ['NO_HEADPHONE', 'PERMISSION_DENIED', 'ENGINE_ERROR', 'DEVICE_NOT_SUPPORTED'];
    const err: AudioError = { code: 'PERMISSION_DENIED', message: 'test' };
    expect(codes).toContain(err.code);
    expect(typeof err.message).toBe('string');
  });
});

describe('AudioEngineStatus', () => {
  it('合法状态为 idle、starting、running、stopping、error', () => {
    const statuses: AudioEngineStatus[] = ['idle', 'starting', 'running', 'stopping', 'error'];
    expect(statuses).toHaveLength(5);
    expect(statuses).toContain('idle');
    expect(statuses).toContain('running');
  });
});

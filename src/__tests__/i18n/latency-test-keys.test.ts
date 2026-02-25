/**
 * 延迟测试相关 i18n 文案
 */
import zh from '@i18n/zh';
import en from '@i18n/en';

describe('i18n latency test keys', () => {
  it('中文存在 settings.audio.latencyTest', () => {
    expect(zh.settings?.audio?.latencyTest).toBe('延迟测试');
  });

  it('英文存在 settings.audio.latencyTest', () => {
    expect(en.settings?.audio?.latencyTest).toBe('Latency test');
  });
});

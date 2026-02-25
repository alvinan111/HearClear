/**
 * 应用全局配置与 Supabase 配置键
 */
import { APP_CONFIG, SUPABASE_CONFIG } from '@config/app';

describe('APP_CONFIG', () => {
  it('NAME_ZH / NAME_EN 非空', () => {
    expect(APP_CONFIG.NAME_ZH).toBeTruthy();
    expect(APP_CONFIG.NAME_EN).toBeTruthy();
  });

  it('VERSION 为 x.y.z 格式', () => {
    expect(APP_CONFIG.VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('PLATFORMS 含 APP_STORE_URL、PLAY_STORE_URL', () => {
    expect(APP_CONFIG.PLATFORMS.APP_STORE_URL).toMatch(/^https:\/\//);
    expect(APP_CONFIG.PLATFORMS.PLAY_STORE_URL).toMatch(/^https:\/\//);
  });

  it('COMPANY 含 EMAIL、PRIVACY_URL、TERMS_URL', () => {
    expect(APP_CONFIG.COMPANY.EMAIL).toMatch(/@/);
    expect(APP_CONFIG.COMPANY.PRIVACY_URL).toMatch(/^https:\/\//);
    expect(APP_CONFIG.COMPANY.TERMS_URL).toMatch(/^https:\/\//);
  });
});

describe('SUPABASE_CONFIG', () => {
  it('存在 URL 与 ANON_KEY 键', () => {
    expect('URL' in SUPABASE_CONFIG).toBe(true);
    expect('ANON_KEY' in SUPABASE_CONFIG).toBe(true);
  });

  it('URL 为空或 https', () => {
    const url = SUPABASE_CONFIG.URL;
    expect(url === '' || url.startsWith('https://')).toBe(true);
  });
});

/**
 * 登录与设置相关 i18n 文案（手机/邮箱/Google、延迟测试等）
 */
import zh from '@i18n/zh';
import en from '@i18n/en';

describe('i18n auth keys', () => {
  it('中文：auth.loginWithPhone / loginWithEmail / loginWithGoogle', () => {
    expect(zh.auth?.loginWithPhone).toBe('手机号');
    expect(zh.auth?.loginWithEmail).toBe('邮箱');
    expect(zh.auth?.loginWithGoogle).toBe('使用 Google 登录');
  });

  it('英文：auth.loginWithPhone / loginWithEmail / loginWithGoogle', () => {
    expect(en.auth?.loginWithPhone).toBe('Phone');
    expect(en.auth?.loginWithEmail).toBe('Email');
    expect(en.auth?.loginWithGoogle).toBe('Sign in with Google');
  });

  it('中文：auth.emailPlaceholder、errors.invalidEmail、errors.googleFailed', () => {
    expect(zh.auth?.emailPlaceholder).toBe('请输入邮箱');
    expect(zh.auth?.errors?.invalidEmail).toBe('请输入正确的邮箱');
    expect(zh.auth?.errors?.googleFailed).toBe('Google 登录失败，请重试');
  });

  it('英文：auth.emailPlaceholder、errors.invalidEmail、errors.googleFailed', () => {
    expect(en.auth?.emailPlaceholder).toBe('Enter your email');
    expect(en.auth?.errors?.invalidEmail).toBe('Please enter a valid email');
    expect(en.auth?.errors?.googleFailed).toBe('Google sign-in failed. Please try again.');
  });
});

describe('i18n settings.audio keys', () => {
  it('中文：settings.audio.latencyTest', () => {
    expect(zh.settings?.audio?.latencyTest).toBe('延迟测试');
  });

  it('英文：settings.audio.latencyTest', () => {
    expect(en.settings?.audio?.latencyTest).toBe('Latency test');
  });
});

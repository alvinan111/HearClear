/**
 * 认证类型：LoginMethod、UserProfile 必需字段
 */
import type { LoginMethod, UserProfile, LoginCredentials } from '@/types/auth';

describe('LoginMethod', () => {
  const validMethods: LoginMethod[] = ['phone', 'email'];

  it('合法值为 phone 与 email', () => {
    expect(validMethods).toContain('phone');
    expect(validMethods).toContain('email');
    expect(validMethods).toHaveLength(2);
  });

  it('类型可赋值给 string（用于 store 与 API）', () => {
    const m: LoginMethod = 'phone';
    const s: string = m;
    expect(s).toBe('phone');
  });
});

describe('LoginCredentials 形状', () => {
  it('method 为 phone 时可有 phone；为 email 时可有 email', () => {
    const byPhone: LoginCredentials = { code: '123456', method: 'phone', phone: '13800138000' };
    const byEmail: LoginCredentials = { code: '123456', method: 'email', email: 'a@b.com' };
    expect(byPhone.method).toBe('phone');
    expect(byEmail.method).toBe('email');
  });
});

describe('UserProfile 必需字段', () => {
  it('包含 id、phone、email、paywallEnabled、isBanned、createdAt', () => {
    const minimal: UserProfile = {
      id: 'u1',
      phone: null,
      email: null,
      nickname: null,
      avatarUrl: null,
      firstUseAt: null,
      totalUsageMinutes: 0,
      paywallEnabled: true,
      trialDaysOverride: null,
      isBanned: false,
      createdAt: new Date().toISOString(),
    };
    expect(minimal.id).toBe('u1');
    expect(minimal.phone).toBeNull();
    expect(minimal.email).toBeNull();
    expect(minimal.paywallEnabled).toBe(true);
    expect(minimal.isBanned).toBe(false);
    expect(typeof minimal.createdAt).toBe('string');
  });
});

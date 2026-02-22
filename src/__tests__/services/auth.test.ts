/**
 * auth.ts 服务层测试
 * Mock supabase 客户端，测试所有公共函数的行为
 */
import * as authService from '@services/auth';

// Mock supabase 模块
jest.mock('@services/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
}));

import { supabase } from '@services/supabase';

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

const dbRow = {
  id: 'user-001',
  phone: '+8613800000001',
  nickname: '测试',
  avatar_url: null,
  first_use_at: '2024-01-01T00:00:00Z',
  total_usage_minutes: 0,
  paywall_enabled: true,
  trial_days_override: null,
  is_banned: false,
  created_at: '2024-01-01T00:00:00Z',
};

function mockFrom(data: unknown, error: unknown = null) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
    insert: jest.fn().mockReturnThis(),
  };
  (mockSupabase.from as jest.Mock).mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('sendOtp', () => {
  it('发送成功返回 error=null', async () => {
    (mockSupabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({ error: null });
    const result = await authService.sendOtp('13800000001');
    expect(result.error).toBeNull();
  });

  it('发送失败返回错误信息', async () => {
    (mockSupabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
      error: { message: '频率限制' },
    });
    const result = await authService.sendOtp('13800000001');
    expect(result.error).toBe('频率限制');
  });

  it('手机号自动加 +86 前缀', async () => {
    (mockSupabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({ error: null });
    await authService.sendOtp('13800000001');
    expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+8613800000001' })
    );
  });

  it('已带 +86 的号码不重复添加前缀', async () => {
    (mockSupabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({ error: null });
    await authService.sendOtp('8613800000001');
    expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+8613800000001' })
    );
  });
});

describe('verifyOtp', () => {
  it('验证成功返回 user', async () => {
    (mockSupabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-001' } },
      error: null,
    });
    mockFrom(dbRow);
    const result = await authService.verifyOtp('13800000001', '123456');
    expect(result.error).toBeNull();
    expect(result.user?.id).toBe('user-001');
    expect(result.user?.phone).toBe('+8613800000001');
  });

  it('验证码错误返回 error', async () => {
    (mockSupabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: { message: '验证码无效' },
    });
    const result = await authService.verifyOtp('13800000001', 'wrong');
    expect(result.error).toBe('验证码无效');
    expect(result.user).toBeNull();
  });

  it('首次登录自动创建 profile', async () => {
    (mockSupabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-new' } },
      error: null,
    });
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
        .mockResolvedValueOnce({ data: null, error: { message: 'not found' } }) // getProfile
        .mockResolvedValueOnce({ data: { ...dbRow, id: 'user-new' }, error: null }), // insert
      insert: jest.fn().mockReturnThis(),
    };
    (mockSupabase.from as jest.Mock).mockReturnValue(chain);

    const result = await authService.verifyOtp('13800000001', '123456');
    expect(result.user?.id).toBe('user-new');
  });
});

describe('getCurrentUser', () => {
  it('有 session 时返回 profile', async () => {
    (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: 'user-001' } } },
    });
    mockFrom(dbRow);
    const user = await authService.getCurrentUser();
    expect(user?.id).toBe('user-001');
  });

  it('无 session 时返回 null', async () => {
    (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });
    const user = await authService.getCurrentUser();
    expect(user).toBeNull();
  });
});

describe('signOut', () => {
  it('调用 supabase.auth.signOut', async () => {
    (mockSupabase.auth.signOut as jest.Mock).mockResolvedValue({});
    await authService.signOut();
    expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1);
  });
});

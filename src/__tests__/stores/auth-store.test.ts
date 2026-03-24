// Mock supabase 防止初始化时因缺少 URL 报错
jest.mock('@services/supabase', () => ({
  supabase: { auth: {}, from: jest.fn() },
}));
jest.mock('@services/auth');

import { useAuthStore } from '@stores/auth-store';
import * as authService from '@services/auth';
import type { UserProfile } from '@/types/auth';

const mockAuthService = authService as jest.Mocked<typeof authService>;

const mockUser: UserProfile = {
  id: 'user-001',
  phone: '+8613800000001',
  email: null,
  nickname: '测试用户',
  avatarUrl: null,
  firstUseAt: new Date().toISOString(),
  totalUsageMinutes: 0,
  paywallEnabled: true,
  trialDaysOverride: null,
  isBanned: false,
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });
});

describe('初始状态', () => {
  it('user 为 null', () => {
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('isAuthenticated 为 false', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('loadCurrentUser', () => {
  it('成功加载已登录用户', async () => {
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
    await useAuthStore.getState().loadCurrentUser();
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('用户未登录时 user 为 null', async () => {
    mockAuthService.getCurrentUser.mockResolvedValue(null);
    await useAuthStore.getState().loadCurrentUser();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('服务异常时不崩溃，清空 user', async () => {
    mockAuthService.getCurrentUser.mockRejectedValue(new Error('network error'));
    await useAuthStore.getState().loadCurrentUser();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });
});

describe('login', () => {
  it('登录成功', async () => {
    mockAuthService.verifyOtp.mockResolvedValue({ user: mockUser, error: null });
    const result = await useAuthStore.getState().login('13800000001', '123456', 'phone');
    expect(result.error).toBeNull();
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('验证码错误时返回 error', async () => {
    mockAuthService.verifyOtp.mockResolvedValue({ user: null, error: '验证码错误' });
    const result = await useAuthStore.getState().login('13800000001', 'wrong', 'phone');
    expect(result.error).toBe('验证码错误');
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe('验证码错误');
  });

  it('登录过程中 isLoading 正确切换', async () => {
    let capturedLoading = false;
    mockAuthService.verifyOtp.mockImplementation(async () => {
      capturedLoading = useAuthStore.getState().isLoading;
      return { user: mockUser, error: null };
    });
    await useAuthStore.getState().login('13800000001', '123456', 'phone');
    expect(capturedLoading).toBe(true);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});

describe('logout', () => {
  it('退出后清空用户状态', async () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
    mockAuthService.signOut.mockResolvedValue(undefined);
    await useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });
});

describe('updateProfile', () => {
  it('更新 nickname', () => {
    useAuthStore.setState({ user: mockUser });
    useAuthStore.getState().updateProfile({ nickname: '新昵称' });
    expect(useAuthStore.getState().user?.nickname).toBe('新昵称');
  });

  it('user 为 null 时不崩溃', () => {
    useAuthStore.setState({ user: null });
    expect(() => useAuthStore.getState().updateProfile({ nickname: 'test' })).not.toThrow();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('partial 更新不影响其他字段', () => {
    useAuthStore.setState({ user: mockUser });
    useAuthStore.getState().updateProfile({ nickname: '新名字' });
    const user = useAuthStore.getState().user!;
    expect(user.phone).toBe(mockUser.phone);
    expect(user.id).toBe(mockUser.id);
  });
});

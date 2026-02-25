export interface UserProfile {
  id: string;
  phone: string | null;
  email: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  firstUseAt: string | null;
  totalUsageMinutes: number;
  /** 该用户是否需要付费（管理员可单独关闭） */
  paywallEnabled: boolean;
  /** 管理员自定义试用天数，null 表示使用全局默认值 */
  trialDaysOverride: number | null;
  isBanned: boolean;
  createdAt: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export type LoginMethod = 'phone' | 'email';

export interface LoginCredentials {
  phone?: string;
  email?: string;
  code: string;
  method: LoginMethod;
}

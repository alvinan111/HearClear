import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import type { UserProfile } from '@/types/auth';

/**
 * 认证服务 - 抽象层，便于后续替换为国内自建认证服务
 */

/** 发送手机验证码（短信） */
export async function sendOtp(phone: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    phone: formatPhone(phone),
  });
  return { error: error?.message ?? null };
}

/** 发送邮箱验证码（Supabase 会发邮件，可能是 magic link 或 OTP，取决于项目配置） */
export async function sendOtpEmail(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
  });
  return { error: error?.message ?? null };
}

/** 验证手机验证码并登录 */
export async function verifyOtp(
  phone: string,
  token: string
): Promise<{ user: UserProfile | null; error: string | null }> {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: formatPhone(phone),
    token,
    type: 'sms',
  });

  if (error || !data.user) {
    return { user: null, error: error?.message ?? '验证失败' };
  }

  const profile = await getOrCreateProfile(data.user.id, { phone, email: null });
  return { user: profile, error: null };
}

/** 验证邮箱验证码并登录（token 为邮件中的 6 位码或 magic link 中的 token） */
export async function verifyOtpEmail(
  email: string,
  token: string
): Promise<{ user: UserProfile | null; error: string | null }> {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token,
    type: 'email',
  });

  if (error || !data.user) {
    return { user: null, error: error?.message ?? '验证失败' };
  }

  const profile = await getOrCreateProfile(data.user.id, { phone: null, email: email.trim().toLowerCase() });
  return { user: profile, error: null };
}

/** 从重定向 URL 解析 hash 或 query 中的 token（Supabase OAuth 回调） */
function getTokensFromRedirectUrl(url: string): { access_token?: string; refresh_token?: string } {
  try {
    const parsed = new URL(url);
    const hash = parsed.hash?.slice(1);
    const query = parsed.search?.slice(1);
    const params = new URLSearchParams(hash || query || '');
    return {
      access_token: params.get('access_token') ?? undefined,
      refresh_token: params.get('refresh_token') ?? undefined,
    };
  } catch {
    return {};
  }
}

/** 使用 Google OAuth 登录（打开浏览器，回调后 setSession 并创建/更新 profile） */
export async function signInWithGoogle(): Promise<{
  user: UserProfile | null;
  error: string | null;
}> {
  const scheme = Constants.expoConfig?.scheme ?? 'hearclear';
  const redirectTo = `${scheme}://auth/callback`;

  const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });

  if (oauthError || !data?.url) {
    return { user: null, error: oauthError?.message ?? '无法发起 Google 登录' };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== 'success' || !result.url) {
    return { user: null, error: null }; // 用户取消，不视为错误
  }

  const { access_token, refresh_token } = getTokensFromRedirectUrl(result.url);
  if (!access_token) {
    return { user: null, error: '登录回调异常，请重试' };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token ?? '',
  });

  if (sessionError || !sessionData.user) {
    return { user: null, error: sessionError?.message ?? '登录失败' };
  }

  const email = sessionData.user.email?.trim().toLowerCase() ?? null;
  const profile = await getOrCreateProfile(sessionData.user.id, { phone: null, email });
  return { user: profile, error: null };
}

/** 获取当前登录用户 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  return getProfile(session.user.id);
}

/** 退出登录 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** 获取用户 profile */
async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return mapProfile(data);
}

/** 获取或创建用户 profile（首次登录时创建） */
async function getOrCreateProfile(
  userId: string,
  payload: { phone: string | null; email: string | null }
): Promise<UserProfile | null> {
  const existing = await getProfile(userId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      phone: payload.phone ?? null,
      email: payload.email ?? null,
      first_use_at: now,
      paywall_enabled: true,
      is_banned: false,
    })
    .select()
    .single();

  if (error || !data) return null;
  return mapProfile(data);
}

/** 数据库字段映射到 UserProfile */
function mapProfile(data: Record<string, unknown>): UserProfile {
  return {
    id: data.id as string,
    phone: (data.phone as string) ?? null,
    email: (data.email as string) ?? null,
    nickname: (data.nickname as string) ?? null,
    avatarUrl: (data.avatar_url as string) ?? null,
    firstUseAt: (data.first_use_at as string) ?? null,
    totalUsageMinutes: (data.total_usage_minutes as number) ?? 0,
    paywallEnabled: (data.paywall_enabled as boolean) ?? true,
    trialDaysOverride: (data.trial_days_override as number) ?? null,
    isBanned: (data.is_banned as boolean) ?? false,
    createdAt: data.created_at as string,
  };
}

/** 格式化手机号（确保有 +86 前缀） */
function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('86') && cleaned.length === 13) return `+${cleaned}`;
  if (cleaned.length === 11) return `+86${cleaned}`;
  return `+${cleaned}`;
}

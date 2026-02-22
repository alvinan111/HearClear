import { supabase } from './supabase';
import type { UserProfile } from '@types/auth';

/**
 * 认证服务 - 抽象层，便于后续替换为国内自建认证服务
 */

/** 发送手机验证码 */
export async function sendOtp(phone: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    phone: formatPhone(phone),
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

  // 获取或创建用户 profile
  const profile = await getOrCreateProfile(data.user.id, phone);
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
  phone: string
): Promise<UserProfile | null> {
  const existing = await getProfile(userId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      phone: phone,
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
    phone: data.phone as string,
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

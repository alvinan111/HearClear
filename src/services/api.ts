/**
 * 通用 API 抽象层
 * 当前基于 Supabase 实现，接口设计为可替换（迁移国内后端时只需改此文件实现）
 */

import { supabase } from './supabase';
import type { AppConfig, AppVersion } from '@/types/config';
import type { Subscription } from '@/types/subscription';

/** 拉取全局远程配置 */
export async function fetchAppConfig(): Promise<AppConfig | null> {
  const { data, error } = await supabase
    .from('app_config')
    .select('key, value');

  if (error || !data) return null;

  const map: Record<string, unknown> = {};
  for (const row of data) {
    map[row.key as string] = row.value;
  }

  return {
    defaultPaywallEnabled: (map.default_paywall_enabled as boolean) ?? true,
    defaultTrialDays: (map.default_trial_days as number) ?? 3,
    prices: (map.prices as AppConfig['prices']) ?? {
      daily: 100,
      monthly: 1800,
      yearly: 12800,
      lifetime: 29800,
    },
    recommendedPlan: (map.recommended_plan as AppConfig['recommendedPlan']) ?? 'yearly',
    announcement: (map.announcement as string) ?? null,
    adsEnabled: (map.ads_enabled as boolean) ?? false,
    splashAdEnabled: (map.splash_ad_enabled as boolean) ?? false,
    bannerAdEnabled: (map.banner_ad_enabled as boolean) ?? false,
    splashAdId: (map.splash_ad_id as AppConfig['splashAdId']) ?? { ios: '', android: '' },
    bannerAdId: (map.banner_ad_id as AppConfig['bannerAdId']) ?? { ios: '', android: '' },
    splashAdDuration: (map.splash_ad_duration as number) ?? 5,
  };
}

/** 拉取版本信息 */
export async function fetchAppVersion(
  platform: 'ios' | 'android'
): Promise<AppVersion | null> {
  const { data, error } = await supabase
    .from('app_versions')
    .select('*')
    .eq('platform', platform)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    platform: data.platform as 'ios' | 'android',
    latestVersion: data.latest_version as string,
    minVersion: data.min_version as string,
    updateUrl: data.update_url as string,
    releaseNotes: (data.release_notes as string) ?? null,
  };
}

/** 拉取用户当前有效订阅 */
export async function fetchActiveSubscription(
  userId: string
): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    id: data.id as string,
    userId: data.user_id as string,
    type: data.type as Subscription['type'],
    status: data.status as Subscription['status'],
    startedAt: data.started_at as string,
    expiresAt: (data.expires_at as string) ?? null,
    grantedBy: (data.granted_by as string) ?? null,
  };
}

/** 提交用户反馈 */
export async function submitFeedback(params: {
  userId: string | null;
  type: string;
  content: string;
  contactInfo?: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('feedbacks').insert({
    user_id: params.userId,
    type: params.type,
    content: params.content,
    contact_info: params.contactInfo ?? null,
    status: 'pending',
  });
  return { error: error?.message ?? null };
}

/** 记录广告事件 */
export async function trackAdEvent(params: {
  userId: string | null;
  adType: 'splash' | 'banner';
  adId: string;
  event: 'impression' | 'click' | 'skip' | 'error';
  platform: 'ios' | 'android';
}): Promise<void> {
  await supabase.from('ad_impressions').insert({
    user_id: params.userId,
    ad_type: params.adType,
    ad_id: params.adId,
    event: params.event,
    platform: params.platform,
  });
}

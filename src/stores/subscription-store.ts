import { create } from 'zustand';
import type { SubscriptionState, Subscription } from '@types/subscription';
import type { UserProfile } from '@types/auth';
import { fetchActiveSubscription } from '@services/api';
import { getItem, setItem } from '@utils/storage';
import { STORAGE_KEYS, TRIAL_DEFAULTS } from '@constants/trial';
import { daysBetween, isSubscriptionExpired } from '@utils/date';
import { DEFAULT_APP_CONFIG } from '@types/config';

interface SubscriptionStore extends SubscriptionState {
  /** 同步用户订阅状态 */
  syncSubscription: (userId: string, userProfile: UserProfile, globalTrialDays: number) => Promise<void>;
  /** 离线时从缓存加载 */
  loadFromCache: (userProfile: UserProfile | null, globalTrialDays: number) => Promise<void>;
}

function computeState(
  subscription: Subscription | null,
  userProfile: UserProfile | null,
  globalTrialDays: number
): Omit<SubscriptionState, 'isLoading'> {
  // 无限制会员或会员有效
  const isPaid =
    !!subscription &&
    subscription.status === 'active' &&
    !isSubscriptionExpired(subscription.expiresAt);

  const isUnlimited = isPaid && subscription?.type === 'unlimited';

  // 用户级付费控制（管理员可关闭）
  const userPaywallEnabled = userProfile?.paywallEnabled ?? true;

  // 试用期
  const trialDays = userProfile?.trialDaysOverride ?? globalTrialDays;
  const firstUseAt = userProfile?.firstUseAt ?? null;
  const daysUsed = firstUseAt ? daysBetween(firstUseAt) : 0;
  const isInTrial = !isPaid && daysUsed < trialDays;
  const trialDaysRemaining = Math.max(0, trialDays - daysUsed);

  // 是否需要展示付费墙
  const showPaywall =
    userPaywallEnabled && // 该用户需要付费
    !isPaid &&             // 没有有效订阅
    !isInTrial;            // 不在试用期

  return {
    subscription,
    isPaid,
    isUnlimited,
    isInTrial,
    trialDaysRemaining,
    showPaywall,
  };
}

export const useSubscriptionStore = create<SubscriptionStore>((set) => ({
  subscription: null,
  isPaid: false,
  isUnlimited: false,
  isInTrial: true,
  trialDaysRemaining: TRIAL_DEFAULTS.TRIAL_DAYS,
  showPaywall: false,
  isLoading: false,

  syncSubscription: async (userId, userProfile, globalTrialDays) => {
    set({ isLoading: true });
    try {
      const subscription = await fetchActiveSubscription(userId);
      // 缓存到本地（离线容灾）
      await setItem(STORAGE_KEYS.USER_PROFILE, userProfile);
      const computed = computeState(subscription, userProfile, globalTrialDays);
      set({ ...computed, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  loadFromCache: async (userProfile, globalTrialDays) => {
    const cachedProfile = userProfile ?? await getItem<UserProfile>(STORAGE_KEYS.USER_PROFILE);
    const computed = computeState(null, cachedProfile, globalTrialDays);
    set({ ...computed, isLoading: false });
  },
}));

export type SubscriptionType = 'daily' | 'monthly' | 'yearly' | 'lifetime' | 'unlimited';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'none';

export interface Subscription {
  id: string;
  userId: string;
  type: SubscriptionType;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string | null; // null = 永不过期（lifetime/unlimited）
  grantedBy: string | null; // 非 null = 管理员授予
}

export interface SubscriptionState {
  subscription: Subscription | null;
  /** 是否有效的付费会员（包括 unlimited） */
  isPaid: boolean;
  /** 是否是管理员授予的无限制会员 */
  isUnlimited: boolean;
  /** 是否在试用期内 */
  isInTrial: boolean;
  /** 剩余试用天数 */
  trialDaysRemaining: number;
  /** 是否需要显示付费墙（取决于后台配置 + 本地状态） */
  showPaywall: boolean;
  isLoading: boolean;
}

export interface PricingPlan {
  type: SubscriptionType;
  priceCents: number; // 单位：分
  labelZh: string;
  labelEn: string;
  descriptionZh: string;
  descriptionEn: string;
  isRecommended: boolean;
}

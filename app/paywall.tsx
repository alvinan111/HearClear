import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useConfigStore } from '@stores/config-store';
import { useSubscriptionStore } from '@stores/subscription-store';
import { useAuthStore } from '@stores/auth-store';
import type { PaymentChannel } from '@types/payment';
import type { SubscriptionType } from '@types/subscription';
import {
  COLORS, FONT_SIZE, FONT_WEIGHT, SPACING,
  BORDER_RADIUS, SHADOW, TOUCH_TARGET,
} from '@constants/theme';

const PLAN_TYPES: SubscriptionType[] = ['daily', 'monthly', 'yearly', 'lifetime'];

function formatPrice(cents: number): string {
  if (cents % 100 === 0) return `¥${cents / 100}`;
  return `¥${(cents / 100).toFixed(2)}`;
}

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { getEffectiveConfig } = useConfigStore();
  const { trialDaysRemaining, isInTrial } = useSubscriptionStore();
  const config = getEffectiveConfig();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType>(config.recommendedPlan);
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>('alipay');
  const [isPaying, setIsPaying] = useState(false);

  const prices = config.prices;

  async function handleSubscribe() {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }

    setIsPaying(true);
    try {
      const amountCents = prices[selectedPlan as keyof typeof prices];
      // 实际支付调用（payment.ts）
      const { createOrder } = await import('@services/payment');
      const result = await createOrder({
        subscriptionType: selectedPlan as 'daily' | 'monthly' | 'yearly' | 'lifetime',
        channel: paymentChannel,
        amountCents,
      });

      if (result.error) {
        Alert.alert('', result.error);
      }
    } catch (e) {
      Alert.alert('', t('common.unknownError'));
    } finally {
      setIsPaying(false);
    }
  }

  const paidFeatures = [
    { key: 'voiceEnhance', icon: '🗣️' },
    { key: 'noiseCancellation', icon: '🌿' },
    { key: 'boneConducting', icon: '🦴' },
    { key: 'noAds', icon: '🚫' },
    { key: 'offlineFull', icon: '📵' },
  ];

  const freeFeatures = [{ key: 'basic', icon: '🔊' }];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 返回按钮 */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>

        {/* 标题 */}
        <LinearGradient colors={['#EBF3FF', '#FFFFFF']} style={styles.headerGradient}>
          <Text style={styles.headerIcon}>👑</Text>
          <Text style={styles.title}>{t('paywall.title')}</Text>
          <Text style={styles.subtitle}>{t('paywall.subtitle')}</Text>
          {isInTrial && (
            <View style={styles.trialBadge}>
              <Text style={styles.trialBadgeText}>
                {t('paywall.trialDaysLeft', { days: trialDaysRemaining })}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* 功能对比 */}
        <View style={styles.featuresSection}>
          <View style={styles.featureColumn}>
            <Text style={styles.featureColumnTitle}>{t('paywall.freeFeatures')}</Text>
            {freeFeatures.map((f) => (
              <View key={f.key} style={styles.featureItem}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureText}>{t(`paywall.features.${f.key}`)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.featureColumn}>
            <Text style={[styles.featureColumnTitle, { color: COLORS.primary }]}>
              {t('paywall.paidFeatures')}
            </Text>
            {paidFeatures.map((f) => (
              <View key={f.key} style={styles.featureItem}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureText}>{t(`paywall.features.${f.key}`)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 方案选择 */}
        <Text style={styles.sectionTitle}>选择方案</Text>
        <View style={styles.plansGrid}>
          {PLAN_TYPES.map((plan) => {
            const isSelected = plan === selectedPlan;
            const isRecommended = plan === config.recommendedPlan;
            const price = prices[plan as keyof typeof prices];
            return (
              <TouchableOpacity
                key={plan}
                style={[styles.planCard, isSelected && styles.planCardSelected]}
                onPress={() => setSelectedPlan(plan)}
                activeOpacity={0.7}
              >
                {isRecommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>{t('paywall.recommended')}</Text>
                  </View>
                )}
                <Text style={[styles.planLabel, isSelected && styles.planLabelSelected]}>
                  {t(`paywall.plans.${plan}.label`)}
                </Text>
                <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                  {formatPrice(price)}
                </Text>
                <Text style={styles.planDesc}>
                  {t(`paywall.plans.${plan}.description`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 支付方式 */}
        <Text style={styles.sectionTitle}>{t('paywall.payWith')}</Text>
        <View style={styles.paymentRow}>
          <TouchableOpacity
            style={[styles.paymentBtn, paymentChannel === 'alipay' && styles.paymentBtnSelected]}
            onPress={() => setPaymentChannel('alipay')}
          >
            <Text style={styles.paymentBtnIcon}>💙</Text>
            <Text style={[styles.paymentBtnText, paymentChannel === 'alipay' && { color: COLORS.primary }]}>
              {t('paywall.alipay')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.paymentBtn, paymentChannel === 'wechat' && styles.paymentBtnSelected]}
            onPress={() => setPaymentChannel('wechat')}
          >
            <Text style={styles.paymentBtnIcon}>💚</Text>
            <Text style={[styles.paymentBtnText, paymentChannel === 'wechat' && { color: COLORS.primary }]}>
              {t('paywall.wechat')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 订阅按钮 */}
        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={handleSubscribe}
          disabled={isPaying}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#1D6FD8', '#1458B0']} style={styles.subscribeGradient}>
            {isPaying ? (
              <ActivityIndicator size="large" color={COLORS.textInverse} />
            ) : (
              <Text style={styles.subscribeText}>
                {t('paywall.subscribe')} — {formatPrice(prices[selectedPlan as keyof typeof prices])}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* 条款链接 */}
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => router.push('/legal/subscription')}>
            <Text style={styles.footerLink}>{t('paywall.terms')}</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}> · </Text>
          <TouchableOpacity onPress={() => router.push('/legal/privacy')}>
            <Text style={styles.footerLink}>{t('settings.about.privacy')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.lg,
  },
  backButton: {
    alignSelf: 'flex-end',
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  backText: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.textSecondary,
  },
  headerGradient: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.xl,
  },
  headerIcon: {
    fontSize: 60,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  trialBadge: {
    marginTop: SPACING.md,
    backgroundColor: '#FEF3C7',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
  },
  trialBadgeText: {
    fontSize: FONT_SIZE.md,
    color: '#92400E',
    fontWeight: FONT_WEIGHT.medium,
  },
  featuresSection: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  featureColumn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  featureColumnTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  featureIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
    width: 24,
  },
  featureText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  plansGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  planCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    minHeight: 100,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    ...SHADOW.sm,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: BORDER_RADIUS.sm,
    borderTopRightRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  recommendedText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textInverse,
    fontWeight: FONT_WEIGHT.semibold,
  },
  planLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  planLabelSelected: {
    color: COLORS.primary,
  },
  planPrice: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  planPriceSelected: {
    color: COLORS.primary,
  },
  planDesc: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  paymentRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  paymentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.md,
    minHeight: TOUCH_TARGET.button,
  },
  paymentBtnSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  paymentBtnIcon: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  paymentBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.text,
  },
  subscribeButton: {
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    ...SHADOW.md,
    marginBottom: SPACING.lg,
  },
  subscribeGradient: {
    height: TOUCH_TARGET.button + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textInverse,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLink: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
  footerDot: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
});

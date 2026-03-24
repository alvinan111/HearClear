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
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useConfigStore } from '@stores/config-store';
import { useSubscriptionStore } from '@stores/subscription-store';
import { useAuthStore } from '@stores/auth-store';
import { ScreenBackdrop } from '@components/ui/ScreenBackdrop';
import { TiltShell } from '@components/ui/TiltShell';
import type { PaymentChannel } from '@/types/payment';
import type { SubscriptionType } from '@/types/subscription';
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
  const heroEnter = useSharedValue(0);
  const pulsePhase = useSharedValue(0);
  const ctaSweep = useSharedValue(0);

  const prices = config.prices;

  React.useEffect(() => {
    heroEnter.value = withTiming(1, { duration: 760, easing: Easing.out(Easing.cubic) });
    pulsePhase.value = withDelay(80, withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true));
    ctaSweep.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.linear }), -1, false);
  }, [ctaSweep, heroEnter, pulsePhase]);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroEnter.value,
    transform: [
      { translateY: interpolate(heroEnter.value, [0, 1], [34, 0]) },
      { scale: interpolate(heroEnter.value, [0, 1], [0.97, 1]) },
    ],
  }));

  const planPulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulsePhase.value, [0, 1], [0.18, 0.42]),
    transform: [{ scale: interpolate(pulsePhase.value, [0, 1], [0.98, 1.02]) }],
  }));

  const ctaSweepStyle = useAnimatedStyle(() => ({
    opacity: 0.3,
    transform: [
      { translateX: interpolate(ctaSweep.value, [0, 1], [-260, 260]) },
      { rotate: '18deg' },
    ],
  }));

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
      <ScreenBackdrop />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 返回按钮 */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>

        {/* 标题 */}
        <Animated.View style={[styles.heroShell, heroStyle]}>
          <TiltShell accent={COLORS.primary} depth="hero" radius={BORDER_RADIUS.xl}>
            <LinearGradient
              colors={['rgba(107,231,255,0.16)', 'rgba(46,240,181,0.07)', 'rgba(255,190,92,0.03)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGlow}
            />
            <LinearGradient colors={['#0B1730', '#11203C']} style={styles.headerGradient}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>PREMIUM ACCESS</Text>
                </View>
                {isInTrial && (
                  <View style={styles.trialBadge}>
                    <Text style={styles.trialBadgeText}>
                      {t('paywall.trialDaysLeft', { days: trialDaysRemaining })}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.headerIcon}>◈</Text>
              <Text style={styles.title}>{t('paywall.title')}</Text>
              <Text style={styles.subtitle}>
                解锁更强的人声增强、更安静的环境抑制和完整离线能力，让 HearClear 进入全功率状态。
              </Text>
              <View style={styles.heroMetrics}>
                <View style={styles.heroMetric}>
                  <Text style={styles.heroMetricLabel}>VOICE</Text>
                  <Text style={styles.heroMetricValue}>BOOST+</Text>
                </View>
                <View style={styles.heroMetric}>
                  <Text style={styles.heroMetricLabel}>ADS</Text>
                  <Text style={styles.heroMetricValue}>OFF</Text>
                </View>
                <View style={styles.heroMetric}>
                  <Text style={styles.heroMetricLabel}>MODE</Text>
                  <Text style={styles.heroMetricValue}>PRO</Text>
                </View>
              </View>
            </LinearGradient>
          </TiltShell>
        </Animated.View>

        {/* 功能对比 */}
        <View style={styles.featuresSection}>
          <TiltShell accent={COLORS.textMuted} radius={BORDER_RADIUS.xl} style={styles.featureShell}>
            <View style={styles.featureColumn}>
              <Text style={styles.featureColumnTitle}>{t('paywall.freeFeatures')}</Text>
              {freeFeatures.map((f) => (
                <View key={f.key} style={styles.featureItem}>
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                  <Text style={styles.featureText}>{t(`paywall.features.${f.key}`)}</Text>
                </View>
              ))}
            </View>
          </TiltShell>
          <TiltShell accent={COLORS.primary} radius={BORDER_RADIUS.xl} style={styles.featureShell}>
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
          </TiltShell>
        </View>

        {/* 方案选择 */}
        <Text style={styles.sectionTitle}>选择方案</Text>
        <View style={styles.plansGrid}>
          {PLAN_TYPES.map((plan) => {
            const isSelected = plan === selectedPlan;
            const isRecommended = plan === config.recommendedPlan;
            const price = prices[plan as keyof typeof prices];
            return (
              <TiltShell
                key={plan}
                accent={isSelected ? COLORS.primary : COLORS.textMuted}
                radius={BORDER_RADIUS.xl}
                style={styles.planShell}
              >
                <TouchableOpacity
                  style={[styles.planCard, isSelected && styles.planCardSelected]}
                  onPress={() => setSelectedPlan(plan)}
                  activeOpacity={0.7}
                >
                  {isSelected && (
                    <Animated.View style={[styles.planPulse, planPulseStyle]}>
                      <LinearGradient
                        colors={['rgba(107,231,255,0.18)', 'rgba(46,240,181,0.08)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    </Animated.View>
                  )}
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
              </TiltShell>
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

        {/* 未登录提示 */}
        {!isAuthenticated && (
          <View style={styles.loginHintRow}>
            <Text style={styles.loginHintText}>登录后即可订阅</Text>
            <TouchableOpacity
              style={styles.loginHintBtn}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.loginHintBtnText}>{t('auth.title')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 订阅按钮 */}
        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={handleSubscribe}
          disabled={isPaying}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#1494D6', COLORS.primary]} style={styles.subscribeGradient}>
            <Animated.View style={[styles.subscribeSweep, ctaSweepStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.38)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            {isPaying ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                <ActivityIndicator size="small" color={COLORS.textInverse} />
                <Text style={styles.subscribeText}>支付中...</Text>
              </View>
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
    paddingBottom: SPACING.xxl,
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
  heroShell: {
    position: 'relative',
    marginBottom: SPACING.xl,
  },
  heroGlow: {
    position: 'absolute',
    left: -12,
    right: -12,
    top: -12,
    bottom: -12,
    borderRadius: BORDER_RADIUS.xl,
  },
  headerGradient: {
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  heroBadge: {
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.primaryDim,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  heroBadgeText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 2.2,
  },
  headerIcon: {
    fontSize: 34,
    marginBottom: SPACING.md,
    color: COLORS.primary,
  },
  title: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.black,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  heroMetrics: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  heroMetric: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  heroMetricLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1.8,
    marginBottom: 2,
  },
  heroMetricValue: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text,
    fontWeight: FONT_WEIGHT.bold,
  },
  trialBadge: {
    backgroundColor: 'rgba(255,190,92,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,190,92,0.28)',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
  },
  trialBadgeText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.warning,
    fontWeight: FONT_WEIGHT.medium,
  },
  featuresSection: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  featureShell: {
    flex: 1,
  },
  featureColumn: {
    flex: 1,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  plansGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  planShell: {
    width: '47%',
  },
  planCard: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'flex-start',
    minHeight: 126,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: COLORS.borderStrong,
    backgroundColor: 'rgba(107,231,255,0.1)',
    ...SHADOW.sm,
  },
  planPulse: {
    position: 'absolute',
    left: -2,
    right: -2,
    top: -2,
    bottom: -2,
    borderRadius: BORDER_RADIUS.xl,
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
    textAlign: 'left',
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
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: BORDER_RADIUS.lg,
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
  loginHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  loginHintText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  loginHintBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primaryDark,
    borderRadius: BORDER_RADIUS.full,
  },
  loginHintBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.textInverse },
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
    overflow: 'hidden',
  },
  subscribeSweep: {
    position: 'absolute',
    top: -14,
    bottom: -14,
    width: 104,
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

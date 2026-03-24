import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, type Href } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useAuthStore } from '@stores/auth-store';
import { useSubscriptionStore } from '@stores/subscription-store';
import { useSettingsStore } from '@stores/settings-store';
import { useAudioStore } from '@stores/audio-store';
import { submitFeedback } from '@services/api';
import { formatRemainingDays } from '@utils/date';
import type { SupportedLanguage } from '@i18n/index';
import { ScreenBackdrop } from '@components/ui/ScreenBackdrop';
import { TiltShell } from '@components/ui/TiltShell';
import {
  COLORS, FONT_SIZE, FONT_WEIGHT, SPACING,
  BORDER_RADIUS, TOUCH_TARGET, SHADOW,
} from '@constants/theme';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const { user, isAuthenticated, logout, authLoading } = useAuthStore(
    useShallow((s) => ({
      user: s.user,
      isAuthenticated: s.isAuthenticated,
      logout: s.logout,
      authLoading: s.isLoading,
    }))
  );
  const { subscription, isPaid, isUnlimited, isInTrial, trialDaysRemaining } = useSubscriptionStore(
    useShallow((s) => ({
      subscription: s.subscription,
      isPaid: s.isPaid,
      isUnlimited: s.isUnlimited,
      isInTrial: s.isInTrial,
      trialDaysRemaining: s.trialDaysRemaining,
    }))
  );
  const { language, setLanguage } = useSettingsStore(
    useShallow((s) => ({ language: s.language, setLanguage: s.setLanguage }))
  );
  const { params, updateParams, resetParams, configLocked } = useAudioStore(
    useShallow((s) => ({
      params: s.params,
      updateParams: s.updateParams,
      resetParams: s.resetParams,
      configLocked: s.configLocked,
    }))
  );

  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'complaint' | 'other'>('bug');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const heroEnter = useSharedValue(0);
  const badgePhase = useSharedValue(0);

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const isZh = language === 'zh';

  useEffect(() => {
    heroEnter.value = withTiming(1, { duration: 760, easing: Easing.out(Easing.cubic) });
    badgePhase.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [badgePhase, heroEnter]);

  const heroCardStyle = useAnimatedStyle(() => ({
    opacity: heroEnter.value,
    transform: [
      { translateY: interpolate(heroEnter.value, [0, 1], [28, 0]) },
      { scale: interpolate(heroEnter.value, [0, 1], [0.98, 1]) },
    ],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(badgePhase.value, [0, 1], [0.86, 1]),
    transform: [{ scale: interpolate(badgePhase.value, [0, 1], [1, 1.04]) }],
  }));

  function handleResetParams() {
    Alert.alert(
      isZh ? '恢复默认' : 'Reset',
      isZh ? '确定要将所有音频参数恢复为默认值？' : 'Reset all audio parameters to default?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), onPress: resetParams, style: 'destructive' },
      ]
    );
  }

  // 会员状态文字
  function getMemberStatusLabel(): string {
    if (isUnlimited) return t('settings.membership.status.unlimited');
    if (isPaid && subscription) {
      return `${t('settings.membership.status.active')} · ${formatRemainingDays(subscription.expiresAt, isZh ? 'zh' : 'en')}`;
    }
    if (isInTrial) return `${t('settings.membership.status.trial')} · ${t('paywall.trialDaysLeft', { days: trialDaysRemaining })}`;
    return t('settings.membership.status.free');
  }

  async function handleFeedbackSubmit() {
    if (feedbackContent.trim().length < 5) {
      Alert.alert('', '请输入至少5个字的反馈内容');
      return;
    }
    setIsSubmittingFeedback(true);
    const { error } = await submitFeedback({
      userId: user?.id ?? null,
      type: feedbackType,
      content: feedbackContent,
    });
    setIsSubmittingFeedback(false);
    if (error) {
      Alert.alert('', t('common.unknownError'));
    } else {
      Alert.alert('', t('settings.feedback.success'));
      setFeedbackContent('');
      setShowFeedbackForm(false);
    }
  }

  function handleLanguageToggle() {
    const newLang: SupportedLanguage = language === 'zh' ? 'en' : 'zh';
    setLanguage(newLang);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenBackdrop />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={heroCardStyle}>
          <TiltShell
            accent={isPaid ? COLORS.success : configLocked ? COLORS.warning : COLORS.primary}
            depth="hero"
            radius={BORDER_RADIUS.xl}
            style={styles.heroShell}
          >
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <Animated.View style={[styles.heroBadge, badgeStyle]}>
                  <Text style={styles.heroBadgeText}>CONTROL DECK</Text>
                </Animated.View>
                <View style={styles.heroVersionChip}>
                  <Text style={styles.heroVersionText}>v{version}</Text>
                </View>
              </View>
              <Text style={styles.pageTitle}>{t('settings.title')}</Text>
              <Text style={styles.heroSubtitle}>
                在这里微调助听参数、会员状态与反馈通道，让整套听感曲线更贴近你的日常环境。
              </Text>
              <View style={styles.heroChips}>
                <View style={[styles.heroChip, isPaid ? styles.heroChipSuccess : styles.heroChipMuted]}>
                  <Text style={styles.heroChipLabel}>MEMBERSHIP</Text>
                  <Text style={styles.heroChipValue}>{getMemberStatusLabel()}</Text>
                </View>
                <View style={styles.heroChip}>
                  <Text style={styles.heroChipLabel}>LANGUAGE</Text>
                  <Text style={styles.heroChipValue}>{language === 'zh' ? '中文' : 'English'}</Text>
                </View>
                <View style={[styles.heroChip, configLocked ? styles.heroChipWarning : styles.heroChipSuccess]}>
                  <Text style={styles.heroChipLabel}>PROFILE</Text>
                  <Text style={styles.heroChipValue}>{configLocked ? 'LOCKED' : 'LIVE'}</Text>
                </View>
              </View>
            </View>
          </TiltShell>
        </Animated.View>

        {/* ── 会员状态 ── */}
        <SectionCard title={t('settings.membership.title')}>
          <View style={styles.memberRow}>
            <Text style={styles.memberIcon}>{isUnlimited ? '👑' : isPaid ? '⭐' : isInTrial ? '🎁' : '🔓'}</Text>
            <View style={styles.memberInfo}>
              <Text style={styles.memberStatus}>{getMemberStatusLabel()}</Text>
              {isAuthenticated && user && (
                <Text style={styles.memberPhone}>{user.phone}</Text>
              )}
            </View>
            {(!isPaid || isInTrial) && (
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => router.push('/paywall')}
              >
                <Text style={styles.upgradeBtnText}>{t('settings.membership.renewOrUpgrade')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {!isAuthenticated && (
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.loginBtnText}>登录 / Sign In</Text>
            </TouchableOpacity>
          )}

          {isAuthenticated && (
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                Alert.alert(
                  isZh ? '退出登录' : 'Sign Out',
                  isZh ? '确定退出当前账号？' : 'Are you sure you want to sign out?',
                  [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('common.confirm'), onPress: logout, style: 'destructive' },
                  ]
                );
              }}
            >
              {authLoading ? (
                <ActivityIndicator size="small" color={COLORS.danger} />
              ) : (
                <Text style={styles.logoutBtnText}>{isZh ? '退出登录' : 'Sign Out'}</Text>
              )}
            </TouchableOpacity>
          )}
        </SectionCard>

        {/* ── 音频参数 ── */}
        <SectionCard title={t('settings.audio.title')}>
          <Text style={styles.audioParamHint}>
            {t('settings.audio.paramsHint')}
          </Text>
          <View style={styles.audioParamRow}>
            <Text style={styles.audioParamLabel}>🔊 {t('home.volume')}</Text>
            <Text style={styles.audioParamValue}>{Math.round(params.gain)}</Text>
          </View>
          <View style={styles.audioParamRow}>
            <Text style={styles.audioParamLabel}>🗣️ {t('home.voiceEnhance')}</Text>
            <Text style={styles.audioParamValue}>{Math.round(params.voiceEnhance * 100)}%</Text>
          </View>
          <View style={styles.audioParamRow}>
            <Text style={styles.audioParamLabel}>🌿 {t('home.noiseReduce')}</Text>
            <Text style={styles.audioParamValue}>{Math.round(params.noiseGate * 100)}%</Text>
          </View>
          <View style={styles.audioParamRow}>
            <Text style={styles.audioParamLabel}>📺 {t('settings.audio.scene')}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['default', 'tv'] as const).map((scene) => (
                <TouchableOpacity
                  key={scene}
                  disabled={configLocked}
                  onPress={() => updateParams({ scene })}
                  style={[
                    styles.feedbackTypeBtn,
                    (params.scene ?? 'default') === scene && styles.feedbackTypeBtnSelected,
                  ]}
                >
                  <Text style={[styles.feedbackTypeBtnText, (params.scene ?? 'default') === scene && { color: COLORS.primary }]}>
                    {scene === 'default' ? t('settings.audio.sceneDefault') : t('settings.audio.sceneTv')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={[styles.audioParamHint, { marginTop: -4, marginBottom: 8 }]}>
            {t('settings.audio.sceneHint')}
          </Text>
          <View style={[styles.audioParamRow, { marginBottom: 4 }]}>
            <Text style={styles.audioParamLabel}>🧠 {t('settings.audio.neuralDenoiser')}</Text>
            <TouchableOpacity
              disabled={configLocked}
              onPress={() => updateParams({ neuralDenoiser: !(params.neuralDenoiser ?? false) })}
              style={[styles.feedbackTypeBtn, (params.neuralDenoiser ?? false) && styles.feedbackTypeBtnSelected]}
            >
              <Text style={[styles.feedbackTypeBtnText, (params.neuralDenoiser ?? false) && { color: COLORS.primary }]}>
                {(params.neuralDenoiser ?? false) ? t('common.on') : t('common.off')}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.audioParamHint, { marginTop: -4, marginBottom: 8 }]}>
            {t('settings.audio.neuralDenoiserHint')}
          </Text>
          <TouchableOpacity style={styles.resetBtn} onPress={handleResetParams}>
            <Text style={styles.resetBtnText}>🔄 {t('settings.audio.resetDefaults')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.audioParamRow, { marginTop: SPACING.md }]}
            onPress={() => router.push('/hearing-test' as Href)}
          >
            <Text style={styles.audioParamLabel}>👂 {t('hearingTest.title')}</Text>
            <Text style={styles.audioParamValue}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.audioParamRow}
            onPress={() => router.push('/latency-test')}
          >
            <Text style={styles.audioParamLabel}>⏱️ {t('settings.latencyTest')}</Text>
            <Text style={styles.audioParamValue}>→</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* ── 语言 ── */}
        <SectionCard title={t('settings.language.title')}>
          <TouchableOpacity style={styles.langToggle} onPress={handleLanguageToggle}>
            <Text style={styles.langLabel}>
              {language === 'zh' ? '🇨🇳 中文' : '🇺🇸 English'}
            </Text>
            <Text style={styles.langSwitch}>
              {language === 'zh' ? '切换为 English →' : 'Switch to 中文 →'}
            </Text>
          </TouchableOpacity>
        </SectionCard>

        {/* ── 意见反馈 ── */}
        <SectionCard title={t('settings.feedback.title')}>
          {!showFeedbackForm ? (
            <TouchableOpacity
              style={styles.feedbackOpenBtn}
              onPress={() => setShowFeedbackForm(true)}
            >
              <Text style={styles.feedbackOpenBtnText}>💬 {t('settings.feedback.submit')}</Text>
            </TouchableOpacity>
          ) : (
            <View>
              {/* 反馈类型 */}
              <View style={styles.feedbackTypes}>
                {(['bug', 'feature', 'complaint', 'other'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.feedbackTypeBtn, feedbackType === type && styles.feedbackTypeBtnSelected]}
                    onPress={() => setFeedbackType(type)}
                  >
                    <Text style={[styles.feedbackTypeBtnText, feedbackType === type && { color: COLORS.primary }]}>
                      {t(`settings.feedback.types.${type}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.feedbackInput}
                value={feedbackContent}
                onChangeText={setFeedbackContent}
                placeholder={t('settings.feedback.placeholder')}
                placeholderTextColor={COLORS.textDisabled}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <View style={styles.feedbackBtns}>
                <TouchableOpacity
                  style={styles.feedbackCancelBtn}
                  onPress={() => setShowFeedbackForm(false)}
                >
                  <Text style={styles.feedbackCancelBtnText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.feedbackSubmitBtn}
                  onPress={handleFeedbackSubmit}
                  disabled={isSubmittingFeedback}
                >
                  {isSubmittingFeedback ? (
                    <ActivityIndicator size="small" color={COLORS.textInverse} />
                  ) : (
                    <Text style={styles.feedbackSubmitBtnText}>{t('settings.feedback.submit')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SectionCard>

        {/* ── 关于 ── */}
        <SectionCard title={t('settings.about.title')}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>{t('settings.about.version')}</Text>
            <Text style={styles.aboutValue}>{version}</Text>
          </View>
          <LegalLink label={t('settings.about.privacy')} href="/legal/privacy" />
          <LegalLink label={t('settings.about.terms')} href="/legal/terms" />
          <LegalLink label={t('settings.about.subscription')} href="/legal/subscription" />
        </SectionCard>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const reveal = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    reveal.value = withTiming(1, { duration: 640, easing: Easing.out(Easing.cubic) });
    glow.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [glow, reveal]);

  const sectionStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: interpolate(reveal.value, [0, 1], [18, 0]) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.28, 0.72]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.98, 1.02]) }],
  }));

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Animated.View style={sectionStyle}>
        <TiltShell accent={COLORS.primary} radius={BORDER_RADIUS.xl}>
          <Animated.View style={[styles.sectionGlow, glowStyle]}>
            <LinearGradient
              colors={['rgba(107,231,255,0.14)', 'rgba(46,240,181,0.05)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <View style={styles.sectionCard}>{children}</View>
        </TiltShell>
      </Animated.View>
    </View>
  );
}

function LegalLink({ label, href }: { label: string; href: Href }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.legalLink}
      onPress={() => router.push(href)}
      activeOpacity={0.7}
    >
      <Text style={styles.legalLinkText}>{label}</Text>
      <Text style={styles.legalLinkArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  heroShell: {
    marginBottom: SPACING.xl,
  },
  heroCard: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  heroBadge: {
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.primaryDim,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  heroBadgeText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 2.4,
  },
  heroVersionChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  heroVersionText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 1.4,
  },
  pageTitle: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.black,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: SPACING.lg,
    maxWidth: 330,
  },
  heroChips: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  heroChip: {
    flex: 1,
    backgroundColor: 'rgba(9,17,33,0.7)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  heroChipMuted: {
    borderColor: COLORS.border,
  },
  heroChipSuccess: {
    borderColor: 'rgba(46,240,181,0.35)',
    backgroundColor: 'rgba(46,240,181,0.08)',
  },
  heroChipWarning: {
    borderColor: 'rgba(255,190,92,0.35)',
    backgroundColor: 'rgba(255,190,92,0.08)',
  },
  heroChipLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1.8,
    marginBottom: 2,
  },
  heroChipValue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: FONT_WEIGHT.semibold,
  },
  section: { marginBottom: SPACING.xl },
  sectionTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
    paddingLeft: SPACING.sm,
    letterSpacing: 2.4,
  },
  sectionGlow: {
    position: 'absolute',
    left: -10,
    right: -10,
    top: -10,
    bottom: -10,
    borderRadius: BORDER_RADIUS.xl,
  },
  sectionCard: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  memberIcon: { fontSize: 36, marginRight: SPACING.md },
  memberInfo: { flex: 1 },
  memberStatus: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text,
  },
  memberPhone: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  upgradeBtn: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...SHADOW.sm,
  },
  upgradeBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textInverse,
  },
  loginBtn: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: BORDER_RADIUS.md,
    height: TOUCH_TARGET.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    ...SHADOW.sm,
  },
  loginBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textInverse,
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: BORDER_RADIUS.md,
    height: TOUCH_TARGET.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  logoutBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.danger,
  },
  audioParamHint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  audioParamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  audioParamLabel: { fontSize: FONT_SIZE.lg, color: COLORS.text },
  audioParamValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  resetBtn: {
    marginTop: SPACING.md,
    alignSelf: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  resetBtnText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TOUCH_TARGET.button,
  },
  langLabel: { fontSize: FONT_SIZE.xl, color: COLORS.text },
  langSwitch: { fontSize: FONT_SIZE.md, color: COLORS.primary },
  feedbackOpenBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  feedbackOpenBtnText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  feedbackTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  feedbackTypeBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  feedbackTypeBtnSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  feedbackTypeBtnText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    backgroundColor: 'rgba(5,9,20,0.5)',
    minHeight: 100,
    marginBottom: SPACING.md,
  },
  feedbackBtns: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  feedbackCancelBtn: {
    flex: 1,
    height: TOUCH_TARGET.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
  },
  feedbackCancelBtnText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
  },
  feedbackSubmitBtn: {
    flex: 2,
    height: TOUCH_TARGET.button,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryDark,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOW.sm,
  },
  feedbackSubmitBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textInverse,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  aboutLabel: { fontSize: FONT_SIZE.lg, color: COLORS.text },
  aboutValue: { fontSize: FONT_SIZE.lg, color: COLORS.textSecondary },
  legalLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    minHeight: TOUCH_TARGET.min,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  legalLinkText: { fontSize: FONT_SIZE.lg, color: COLORS.text },
  legalLinkArrow: { fontSize: FONT_SIZE.xl, color: COLORS.textSecondary },
});

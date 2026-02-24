import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuthStore } from '@stores/auth-store';
import { useSubscriptionStore } from '@stores/subscription-store';
import { useSettingsStore } from '@stores/settings-store';
import { useAudioStore } from '@stores/audio-store';
import { submitFeedback } from '@services/api';
import { formatRemainingDays } from '@utils/date';
import type { SupportedLanguage } from '@i18n/index';
import {
  COLORS, FONT_SIZE, FONT_WEIGHT, SPACING,
  BORDER_RADIUS, TOUCH_TARGET, SHADOW,
} from '@constants/theme';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const { user, isAuthenticated, logout, isLoading: authLoading } = useAuthStore();
  const { subscription, isPaid, isUnlimited, isInTrial, trialDaysRemaining } = useSubscriptionStore();
  const { language, setLanguage } = useSettingsStore();
  const { params, resetParams } = useAudioStore();

  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'complaint' | 'other'>('bug');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const isZh = language === 'zh';

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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>{t('settings.title')}</Text>

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
          <TouchableOpacity style={styles.resetBtn} onPress={handleResetParams}>
            <Text style={styles.resetBtnText}>🔄 {t('settings.audio.resetDefaults')}</Text>
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
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function LegalLink({ label, href }: { label: string; href: string }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.legalLink}
      onPress={() => router.push(href as any)}
      activeOpacity={0.7}
    >
      <Text style={styles.legalLinkText}>{label}</Text>
      <Text style={styles.legalLinkArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  content: { padding: SPACING.lg },
  pageTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: SPACING.xl,
  },
  section: { marginBottom: SPACING.xl },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    paddingLeft: SPACING.sm,
  },
  sectionCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
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
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  upgradeBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textInverse,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    height: TOUCH_TARGET.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
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
    paddingVertical: SPACING.sm,
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
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
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
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
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

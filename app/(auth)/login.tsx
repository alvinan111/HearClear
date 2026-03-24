import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { LoginMethod } from '@/types/auth';
import { sendOtp, sendOtpEmail } from '@services/auth';
import { useAuthStore } from '@stores/auth-store';
import { ScreenBackdrop } from '@components/ui/ScreenBackdrop';
import { TiltShell } from '@components/ui/TiltShell';
import {
  COLORS, FONT_SIZE, FONT_WEIGHT, SPACING,
  BORDER_RADIUS, TOUCH_TARGET, SHADOW,
} from '@constants/theme';

const CODE_COOLDOWN = 60; // 秒
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(s: string): boolean {
  return EMAIL_REGEX.test(s.trim());
}

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [method, setMethod] = useState<LoginMethod>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heroEnter = useSharedValue(0);
  const formEnter = useSharedValue(0);
  const badgePhase = useSharedValue(0);
  const ctaSweep = useSharedValue(0);

  useEffect(() => {
    heroEnter.value = withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) });
    formEnter.value = withDelay(120, withTiming(1, { duration: 760, easing: Easing.out(Easing.cubic) }));
    badgePhase.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, true);
    ctaSweep.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1, false);
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [badgePhase, ctaSweep, formEnter, heroEnter]);

  const heroCardStyle = useAnimatedStyle(() => ({
    opacity: heroEnter.value,
    transform: [
      { translateY: interpolate(heroEnter.value, [0, 1], [32, 0]) },
      { scale: interpolate(heroEnter.value, [0, 1], [0.96, 1]) },
    ],
  }));

  const formCardStyle = useAnimatedStyle(() => ({
    opacity: formEnter.value,
    transform: [
      { translateY: interpolate(formEnter.value, [0, 1], [42, 0]) },
      { scale: interpolate(formEnter.value, [0, 1], [0.98, 1]) },
    ],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(badgePhase.value, [0, 1], [0.84, 1]),
    transform: [{ scale: interpolate(badgePhase.value, [0, 1], [1, 1.04]) }],
  }));

  const ctaSweepStyle = useAnimatedStyle(() => ({
    opacity: 0.28,
    transform: [
      { translateX: interpolate(ctaSweep.value, [0, 1], [-240, 240]) },
      { rotate: '18deg' },
    ],
  }));

  function startCooldown() {
    setCooldown(CODE_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendCode() {
    if (method === 'phone') {
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length !== 11) {
        Alert.alert('', t('auth.errors.invalidPhone'));
        return;
      }
      setIsSending(true);
      const { error } = await sendOtp(phone);
      setIsSending(false);
      if (error) {
        Alert.alert('', t('auth.errors.sendFailed'));
      } else {
        startCooldown();
      }
    } else {
      if (!isValidEmail(email)) {
        Alert.alert('', t('auth.errors.invalidEmail'));
        return;
      }
      setIsSending(true);
      const { error } = await sendOtpEmail(email);
      setIsSending(false);
      if (error) {
        Alert.alert('', t('auth.errors.sendFailed'));
      } else {
        startCooldown();
      }
    }
  }

  async function handleLogin() {
    const identifier = method === 'phone' ? phone : email;
    if (method === 'phone') {
      if (phone.replace(/\D/g, '').length !== 11) {
        Alert.alert('', t('auth.errors.invalidPhone'));
        return;
      }
    } else {
      if (!isValidEmail(email)) {
        Alert.alert('', t('auth.errors.invalidEmail'));
        return;
      }
    }
    if (code.length !== 6) {
      Alert.alert('', t('auth.errors.invalidCode'));
      return;
    }
    const { error } = await login(identifier, code, method);
    if (error) {
      Alert.alert('', t('auth.errors.loginFailed'));
    } else {
      router.back();
    }
  }

  async function handleGoogleLogin() {
    const { error } = await loginWithGoogle();
    if (error) {
      Alert.alert('', t('auth.errors.googleFailed'));
    } else {
      router.back();
    }
  }

  const canSendPhone = cooldown === 0 && !isSending && phone.replace(/\D/g, '').length === 11;
  const canSendEmail = cooldown === 0 && !isSending && isValidEmail(email);
  const canSend = method === 'phone' ? canSendPhone : canSendEmail;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBackdrop />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Animated.View style={heroCardStyle}>
            <TiltShell accent={COLORS.primary} depth="hero" radius={BORDER_RADIUS.xl} style={styles.heroShell}>
              <View style={styles.heroCard}>
                <Animated.View style={[styles.heroBadge, badgeStyle]}>
                  <Text style={styles.heroBadgeText}>PRIVATE ACCESS</Text>
                </Animated.View>
                <Text style={styles.title}>进入 HearClear</Text>
                <Text style={styles.subtitle}>
                  实时助听、个性化增益和更安静的人声链路，在这里完成身份验证后立即解锁。
                </Text>
                <View style={styles.heroStats}>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatLabel}>LATENCY</Text>
                    <Text style={styles.heroStatValue}>LOW</Text>
                  </View>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatLabel}>VOICE</Text>
                    <Text style={styles.heroStatValue}>AI+</Text>
                  </View>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatLabel}>MODE</Text>
                    <Text style={styles.heroStatValue}>LIVE</Text>
                  </View>
                </View>
              </View>
            </TiltShell>
          </Animated.View>

          <Animated.View style={[styles.formShell, formCardStyle]}>
            <TiltShell accent={COLORS.success} radius={BORDER_RADIUS.xl}>
              <LinearGradient
                colors={['rgba(107,231,255,0.16)', 'rgba(46,240,181,0.06)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.formGlow}
              />
              <View style={styles.formCard}>
                <Text style={styles.formEyebrow}>SECURE SIGN IN</Text>

                <View style={styles.methodRow}>
                  <TouchableOpacity
                    style={[styles.methodTab, method === 'phone' && styles.methodTabActive]}
                    onPress={() => setMethod('phone')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.methodTabText, method === 'phone' && styles.methodTabTextActive]}>
                      {t('auth.loginWithPhone')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.methodTab, method === 'email' && styles.methodTabActive]}
                    onPress={() => setMethod('email')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.methodTabText, method === 'email' && styles.methodTabTextActive]}>
                      {t('auth.loginWithEmail')}
                    </Text>
                  </TouchableOpacity>
                </View>

              {method === 'phone' ? (
                <View style={styles.inputGroup}>
                  <View style={styles.prefixArea}>
                    <Text style={styles.prefix}>+86</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 11))}
                    placeholder={t('auth.phonePlaceholder')}
                    placeholderTextColor={COLORS.textDisabled}
                    keyboardType="phone-pad"
                    maxLength={11}
                    returnKeyType="next"
                  />
                </View>
              ) : (
                <View style={styles.inputGroup}>
                  <TextInput
                    style={[styles.input, { paddingLeft: SPACING.md }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t('auth.emailPlaceholder')}
                    placeholderTextColor={COLORS.textDisabled}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
              )}

              <View style={styles.codeRow}>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder={t('auth.codePlaceholder')}
                  placeholderTextColor={COLORS.textDisabled}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity
                  style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
                  onPress={handleSendCode}
                  disabled={!canSend}
                  activeOpacity={0.8}
                >
                <LinearGradient
                  colors={canSend ? ['#1B8AD0', COLORS.primary] : ['#324256', '#324256']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendButtonFill}
                >
                  <Animated.View style={[styles.sendSweep, ctaSweepStyle]}>
                    <LinearGradient
                      colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
                  {isSending ? (
                    <ActivityIndicator size="small" color={COLORS.textInverse} />
                  ) : (
                      <Text style={styles.sendButtonText}>
                        {cooldown > 0
                          ? t('auth.resendIn', { seconds: cooldown })
                          : t('auth.sendCode')}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.loginButton, (isLoading || code.length !== 6) && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={isLoading || code.length !== 6}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={isLoading || code.length !== 6 ? ['#324256', '#324256'] : ['#1494D6', COLORS.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.loginButtonFill}
                >
                  <Animated.View style={[styles.loginSweep, ctaSweepStyle]}>
                    <LinearGradient
                      colors={['transparent', 'rgba(255,255,255,0.42)', 'transparent']}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
                  {isLoading ? (
                    <ActivityIndicator size="large" color={COLORS.textInverse} />
                  ) : (
                    <Text style={styles.loginButtonText}>{t('auth.login')}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.orDivider')}</Text>
                <View style={styles.dividerLine} />
              </View>
              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <Text style={styles.googleButtonIcon}>◌</Text>
                <Text style={styles.googleButtonText}>{t('auth.loginWithGoogle')}</Text>
              </TouchableOpacity>

                <View style={styles.agreementRow}>
                  <Text style={styles.agreementText}>{t('auth.agreePrefix')} </Text>
                  <TouchableOpacity onPress={() => router.push('/legal/terms')}>
                    <Text style={styles.agreementLink}>{t('auth.terms')}</Text>
                  </TouchableOpacity>
                  <Text style={styles.agreementText}> {t('auth.and')} </Text>
                  <TouchableOpacity onPress={() => router.push('/legal/privacy')}>
                    <Text style={styles.agreementLink}>{t('auth.privacy')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TiltShell>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  heroShell: {
    marginBottom: SPACING.lg,
  },
  heroCard: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.primaryDim,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.md,
  },
  heroBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    letterSpacing: 2.4,
  },
  title: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.black,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    letterSpacing: 0.6,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
    maxWidth: 320,
  },
  heroStats: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  heroStat: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(11,21,39,0.68)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroStatLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1.8,
    marginBottom: 2,
  },
  heroStatValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  formShell: {
    position: 'relative',
    marginBottom: SPACING.lg,
  },
  formGlow: {
    position: 'absolute',
    left: -12,
    right: -12,
    top: -12,
    bottom: -12,
    borderRadius: BORDER_RADIUS.xl,
  },
  formCard: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.md,
  },
  formEyebrow: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 2.6,
    marginBottom: SPACING.md,
  },
  methodRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
    backgroundColor: 'rgba(5,9,20,0.5)',
    borderRadius: BORDER_RADIUS.full,
    padding: 4,
  },
  methodTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  methodTabActive: {
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  methodTabText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
  },
  methodTabTextActive: {
    color: COLORS.primary,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    backgroundColor: 'rgba(5,9,20,0.5)',
    minHeight: TOUCH_TARGET.button,
  },
  prefixArea: {
    paddingHorizontal: SPACING.md,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    justifyContent: 'center',
    height: '100%',
  },
  prefix: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text,
    fontWeight: FONT_WEIGHT.medium,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    minHeight: TOUCH_TARGET.button,
  },
  codeRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  codeInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(5,9,20,0.5)',
    letterSpacing: 6,
  },
  sendButton: {
    borderRadius: BORDER_RADIUS.lg,
    minWidth: 110,
    minHeight: TOUCH_TARGET.button,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.8,
  },
  sendButtonFill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    overflow: 'hidden',
  },
  sendSweep: {
    position: 'absolute',
    top: -8,
    bottom: -8,
    width: 72,
  },
  sendButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textInverse,
  },
  loginButton: {
    borderRadius: BORDER_RADIUS.full,
    height: TOUCH_TARGET.button,
    marginBottom: SPACING.xl,
    ...SHADOW.md,
    overflow: 'hidden',
  },
  loginButtonDisabled: {
    opacity: 0.84,
  },
  loginButtonFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  loginSweep: {
    position: 'absolute',
    top: -12,
    bottom: -12,
    width: 96,
  },
  loginButtonText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textInverse,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  googleButton: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    height: TOUCH_TARGET.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  googleButtonIcon: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.primary,
  },
  googleButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text,
  },
  agreementRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  agreementText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  agreementLink: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
});

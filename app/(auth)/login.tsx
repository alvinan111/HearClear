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
import type { LoginMethod } from '@types/auth';
import { sendOtp, sendOtpEmail } from '@services/auth';
import { useAuthStore } from '@stores/auth-store';
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

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* 标题 */}
          <Text style={styles.title}>{t('auth.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>

          {/* 手机 / 邮箱切换 */}
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

          {/* 手机号或邮箱输入 */}
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

          {/* 验证码输入 */}
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
              activeOpacity={0.7}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={COLORS.textInverse} />
              ) : (
                <Text style={styles.sendButtonText}>
                  {cooldown > 0
                    ? t('auth.resendIn', { seconds: cooldown })
                    : t('auth.sendCode')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 登录按钮 */}
          <TouchableOpacity
            style={[styles.loginButton, (isLoading || code.length !== 6) && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading || code.length !== 6}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator size="large" color={COLORS.textInverse} />
            ) : (
              <Text style={styles.loginButtonText}>{t('auth.login')}</Text>
            )}
          </TouchableOpacity>

          {/* 或 / Google 登录 */}
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
            <Text style={styles.googleButtonText}>{t('auth.loginWithGoogle')}</Text>
          </TouchableOpacity>

          {/* 协议说明 */}
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
    paddingTop: SPACING.xxxl,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xxl,
  },
  methodRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  methodTab: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  methodTabActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}18`,
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
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
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
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    letterSpacing: 6,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 110,
    minHeight: TOUCH_TARGET.button,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textDisabled,
  },
  sendButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textInverse,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    height: TOUCH_TARGET.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    ...SHADOW.md,
  },
  loginButtonDisabled: {
    backgroundColor: COLORS.textDisabled,
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
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.surface,
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

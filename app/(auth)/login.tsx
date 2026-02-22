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
import { sendOtp } from '@services/auth';
import { useAuthStore } from '@stores/auth-store';
import {
  COLORS, FONT_SIZE, FONT_WEIGHT, SPACING,
  BORDER_RADIUS, TOUCH_TARGET, SHADOW,
} from '@constants/theme';

const CODE_COOLDOWN = 60; // 秒

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [phone, setPhone] = useState('');
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
  }

  async function handleLogin() {
    if (phone.replace(/\D/g, '').length !== 11) {
      Alert.alert('', t('auth.errors.invalidPhone'));
      return;
    }
    if (code.length !== 6) {
      Alert.alert('', t('auth.errors.invalidCode'));
      return;
    }
    const { error } = await login(phone, code);
    if (error) {
      Alert.alert('', t('auth.errors.loginFailed'));
    } else {
      router.back();
    }
  }

  const canSend = cooldown === 0 && !isSending && phone.replace(/\D/g, '').length === 11;

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

          {/* 手机号输入 */}
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

import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@constants/theme';

export default function TermsScreen() {
  const { i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');

  return (
    <>
      <Stack.Screen options={{ title: isZh ? '用户协议' : 'Terms of Use' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {isZh ? <TermsZh /> : <TermsEn />}
      </ScrollView>
    </>
  );
}

function TermsZh() {
  return (
    <View>
      <Text style={styles.title}>用户协议</Text>
      <Text style={styles.updated}>更新日期：2025年1月1日</Text>

      <Text style={styles.body}>
        欢迎使用 AI助听器（HearClear）。在使用本应用之前，请仔细阅读以下条款。使用本应用即表示您同意本协议。
      </Text>

      <Text style={styles.section}>1. 服务描述</Text>
      <Text style={styles.body}>
        AI助听器提供实时音频增强功能，包括音量放大、人声增强、噪音抑制和回声消除。本应用不构成医疗设备，不能替代专业听力诊断或医疗助听器。
      </Text>

      <Text style={styles.section}>2. 账号注册</Text>
      <Text style={styles.body}>
        • 您必须提供真实的手机号码进行注册{'\n'}
        • 您对账号安全负责，不得与他人共享账号{'\n'}
        • 每个手机号只能注册一个账号
      </Text>

      <Text style={styles.section}>3. 免费功能与付费功能</Text>
      <Text style={styles.body}>
        本应用提供免费试用期，试用期结束后需要购买会员才能使用全部功能。免费用户可使用基础音量放大功能，但配置选项受到限制。
      </Text>

      <Text style={styles.section}>4. 禁止行为</Text>
      <Text style={styles.body}>
        您不得：{'\n'}
        • 使用本应用进行非法监听或录音{'\n'}
        • 反向工程、破解或修改本应用{'\n'}
        • 以商业目的转售账号或服务{'\n'}
        • 传播虚假信息或骚扰他人
      </Text>

      <Text style={styles.section}>5. 免责声明</Text>
      <Text style={styles.body}>
        本应用按"现状"提供。我们不保证服务持续无中断，不对因使用本应用造成的任何损失负责。本应用为辅助工具，不能替代专业医疗建议。
      </Text>

      <Text style={styles.section}>6. 服务变更与终止</Text>
      <Text style={styles.body}>
        我们保留修改或终止服务的权利。如发生重大变更，将提前通知用户。
      </Text>

      <Text style={styles.section}>7. 适用法律</Text>
      <Text style={styles.body}>
        本协议受中华人民共和国法律管辖。
      </Text>

      <Text style={styles.contact}>
        联系我们：support@hearclear.app
      </Text>
    </View>
  );
}

function TermsEn() {
  return (
    <View>
      <Text style={styles.title}>Terms of Use</Text>
      <Text style={styles.updated}>Last Updated: January 1, 2025</Text>

      <Text style={styles.body}>
        Welcome to HearClear. By using this app, you agree to these Terms of Use. Please read them carefully.
      </Text>

      <Text style={styles.section}>1. Service Description</Text>
      <Text style={styles.body}>
        HearClear provides real-time audio enhancement including volume amplification, voice enhancement, noise suppression, and echo cancellation. This app is not a medical device and does not replace professional audiological diagnosis or medical hearing aids.
      </Text>

      <Text style={styles.section}>2. Account Registration</Text>
      <Text style={styles.body}>
        • You must provide a valid phone number to register{'\n'}
        • You are responsible for account security and must not share accounts{'\n'}
        • One account per phone number
      </Text>

      <Text style={styles.section}>3. Free and Paid Features</Text>
      <Text style={styles.body}>
        The app offers a free trial period. After the trial, a subscription is required to access all features. Free users can access basic amplification with limited configuration options.
      </Text>

      <Text style={styles.section}>4. Prohibited Activities</Text>
      <Text style={styles.body}>
        You must not:{'\n'}
        • Use the app for illegal eavesdropping or recording{'\n'}
        • Reverse engineer, crack, or modify the app{'\n'}
        • Commercially resell accounts or services{'\n'}
        • Spread false information or harass others
      </Text>

      <Text style={styles.section}>5. Disclaimer</Text>
      <Text style={styles.body}>
        The app is provided "as is." We do not guarantee uninterrupted service and are not liable for any losses arising from use of the app. This app is an assistive tool, not a substitute for professional medical advice.
      </Text>

      <Text style={styles.section}>6. Changes and Termination</Text>
      <Text style={styles.body}>
        We reserve the right to modify or terminate the service. Users will be notified of significant changes.
      </Text>

      <Text style={styles.section}>7. Governing Law</Text>
      <Text style={styles.body}>
        These terms are governed by the laws of the People's Republic of China (for Chinese users) or the laws of the jurisdiction where you reside.
      </Text>

      <Text style={styles.contact}>
        Contact: support@hearclear.app
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl, paddingBottom: 80 },
  title: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: COLORS.text, marginBottom: SPACING.sm },
  updated: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  section: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.text, marginTop: SPACING.xl, marginBottom: SPACING.sm },
  body: { fontSize: FONT_SIZE.md, color: COLORS.text, lineHeight: 28 },
  contact: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginTop: SPACING.xxl },
});

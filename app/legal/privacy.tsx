import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@constants/theme';

export default function PrivacyScreen() {
  const { i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');

  return (
    <>
      <Stack.Screen options={{ title: isZh ? '隐私政策' : 'Privacy Policy' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {isZh ? <PrivacyZh /> : <PrivacyEn />}
      </ScrollView>
    </>
  );
}

function PrivacyZh() {
  return (
    <View>
      <Text style={styles.title}>隐私政策</Text>
      <Text style={styles.updated}>更新日期：2025年1月1日</Text>

      <Text style={styles.section}>1. 信息收集</Text>
      <Text style={styles.body}>
        AI助听器（以下简称"我们"）重视您的隐私。本隐私政策说明我们如何收集、使用和保护您的个人信息。{'\n\n'}
        我们收集以下信息：{'\n'}
        • 手机号码：用于账号注册和登录{'\n'}
        • 使用数据：应用使用时长，用于统计分析{'\n'}
        • 设备信息：操作系统版本、设备型号，用于技术支持{'\n'}
        • 音频数据：麦克风实时采集的音频数据仅在设备本地处理，不上传至服务器
      </Text>

      <Text style={styles.section}>2. 信息使用</Text>
      <Text style={styles.body}>
        我们使用您的信息：{'\n'}
        • 提供和改善应用服务{'\n'}
        • 管理您的订阅和支付{'\n'}
        • 发送服务相关通知{'\n'}
        • 技术支持和客户服务
      </Text>

      <Text style={styles.section}>3. 信息共享</Text>
      <Text style={styles.body}>
        我们不会出售您的个人信息。我们可能与以下第三方共享必要信息：{'\n'}
        • 支付服务提供商（微信支付、支付宝）：处理支付{'\n'}
        • 短信服务提供商（阿里云）：发送验证码{'\n'}
        • 广告服务（穿山甲）：向免费用户展示广告
      </Text>

      <Text style={styles.section}>4. 数据安全</Text>
      <Text style={styles.body}>
        我们采用加密传输和存储技术保护您的数据安全。音频数据不离开您的设备。
      </Text>

      <Text style={styles.section}>5. 您的权利</Text>
      <Text style={styles.body}>
        您有权：{'\n'}
        • 访问和修改您的个人信息{'\n'}
        • 删除您的账号和数据{'\n'}
        • 拒绝接收营销通知{'\n\n'}
        如需行使上述权利，请联系：support@hearclear.app
      </Text>

      <Text style={styles.section}>6. 儿童隐私</Text>
      <Text style={styles.body}>
        本应用不面向13岁以下儿童。我们不会有意收集儿童个人信息。
      </Text>

      <Text style={styles.section}>7. 政策变更</Text>
      <Text style={styles.body}>
        本政策如有更新，我们将通过应用内通知告知您。继续使用本应用视为接受更新后的政策。
      </Text>

      <Text style={styles.contact}>
        联系我们：support@hearclear.app{'\n'}
        公司：HearClear Team
      </Text>
    </View>
  );
}

function PrivacyEn() {
  return (
    <View>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.updated}>Last Updated: January 1, 2025</Text>

      <Text style={styles.section}>1. Information We Collect</Text>
      <Text style={styles.body}>
        HearClear ("we", "us") respects your privacy. This policy describes how we collect, use, and protect your personal information.{'\n\n'}
        We collect:{'\n'}
        • Phone number: for account registration and login{'\n'}
        • Usage data: app usage duration for analytics{'\n'}
        • Device information: OS version, device model for technical support{'\n'}
        • Audio data: microphone audio is processed locally on your device and is never uploaded to our servers
      </Text>

      <Text style={styles.section}>2. How We Use Your Information</Text>
      <Text style={styles.body}>
        We use your information to:{'\n'}
        • Provide and improve our services{'\n'}
        • Manage your subscriptions and payments{'\n'}
        • Send service-related notifications{'\n'}
        • Provide technical and customer support
      </Text>

      <Text style={styles.section}>3. Information Sharing</Text>
      <Text style={styles.body}>
        We do not sell your personal data. We may share necessary data with:{'\n'}
        • Payment processors (WeChat Pay, Alipay): to process payments{'\n'}
        • SMS providers (Alibaba Cloud): to send verification codes{'\n'}
        • Ad networks (Pangle): to show ads to free users
      </Text>

      <Text style={styles.section}>4. Data Security</Text>
      <Text style={styles.body}>
        We use encryption to protect your data in transit and at rest. Audio data never leaves your device.
      </Text>

      <Text style={styles.section}>5. Your Rights</Text>
      <Text style={styles.body}>
        You have the right to:{'\n'}
        • Access and update your personal information{'\n'}
        • Delete your account and associated data{'\n'}
        • Opt out of marketing communications{'\n\n'}
        To exercise these rights, contact: support@hearclear.app
      </Text>

      <Text style={styles.section}>6. Children's Privacy</Text>
      <Text style={styles.body}>
        This app is not directed to children under 13. We do not knowingly collect information from children.
      </Text>

      <Text style={styles.section}>7. Policy Changes</Text>
      <Text style={styles.body}>
        We will notify you of significant policy changes via in-app notification. Continued use of the app constitutes acceptance of the updated policy.
      </Text>

      <Text style={styles.contact}>
        Contact: support@hearclear.app{'\n'}
        Company: HearClear Team
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.xl,
    paddingBottom: 80,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  updated: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  section: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  body: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    lineHeight: 28,
  },
  contact: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xxl,
    lineHeight: 26,
  },
});

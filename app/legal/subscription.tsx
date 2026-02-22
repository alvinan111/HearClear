import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@constants/theme';

export default function SubscriptionTermsScreen() {
  const { i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');

  return (
    <>
      <Stack.Screen options={{ title: isZh ? '订阅条款' : 'Subscription Terms' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {isZh ? <SubscriptionZh /> : <SubscriptionEn />}
      </ScrollView>
    </>
  );
}

function SubscriptionZh() {
  return (
    <View>
      <Text style={styles.title}>订阅条款</Text>
      <Text style={styles.updated}>更新日期：2025年1月1日</Text>

      <Text style={styles.section}>订阅方案</Text>
      <Text style={styles.body}>
        AI助听器提供以下订阅方案：{'\n'}
        • 日卡：按日收费，次日0点到期{'\n'}
        • 月付：按月收费，自动续订{'\n'}
        • 年付：按年收费，自动续订，相比月付更划算{'\n'}
        • 终身：一次性付费，永久有效，不自动续订
      </Text>

      <Text style={styles.section}>自动续订</Text>
      <Text style={styles.body}>
        月付和年付方案将在到期前24小时自动扣款续订，除非您提前取消。终身方案不自动续订。
      </Text>

      <Text style={styles.section}>取消订阅</Text>
      <Text style={styles.body}>
        您可在任何时候取消自动续订：{'\n'}
        • iOS：在"设置 - Apple ID - 订阅"中取消{'\n'}
        • Android：在 Google Play "订阅"中取消{'\n\n'}
        取消后，您可继续使用已付费期内的服务，到期后不再续订。
      </Text>

      <Text style={styles.section}>退款政策</Text>
      <Text style={styles.body}>
        • iOS 用户：退款请通过 Apple 退款流程申请（reportaproblem.apple.com）{'\n'}
        • Android 用户：退款请通过 Google Play 退款流程申请{'\n'}
        • 国内支付（微信/支付宝）：购买后7天内未使用超过1小时可申请退款，联系 support@hearclear.app
      </Text>

      <Text style={styles.section}>价格变动</Text>
      <Text style={styles.body}>
        订阅价格如有调整，将提前30天通知。价格变动不影响当前订阅周期。
      </Text>

      <Text style={styles.contact}>
        如有疑问，请联系：support@hearclear.app
      </Text>
    </View>
  );
}

function SubscriptionEn() {
  return (
    <View>
      <Text style={styles.title}>Subscription Terms</Text>
      <Text style={styles.updated}>Last Updated: January 1, 2025</Text>

      <Text style={styles.section}>Subscription Plans</Text>
      <Text style={styles.body}>
        HearClear offers the following plans:{'\n'}
        • Daily: billed per day, expires at midnight{'\n'}
        • Monthly: billed monthly, auto-renews{'\n'}
        • Yearly: billed annually, auto-renews at a better value{'\n'}
        • Lifetime: one-time purchase, never expires, no auto-renewal
      </Text>

      <Text style={styles.section}>Auto-Renewal</Text>
      <Text style={styles.body}>
        Monthly and yearly plans auto-renew 24 hours before expiry unless cancelled in advance. Lifetime plans do not auto-renew.
      </Text>

      <Text style={styles.section}>Cancellation</Text>
      <Text style={styles.body}>
        You can cancel auto-renewal at any time:{'\n'}
        • iOS: Settings → Apple ID → Subscriptions{'\n'}
        • Android: Google Play → Subscriptions{'\n\n'}
        After cancellation, you retain access until the end of the current billing period.
      </Text>

      <Text style={styles.section}>Refund Policy</Text>
      <Text style={styles.body}>
        • iOS users: request refunds via Apple at reportaproblem.apple.com{'\n'}
        • Android users: request refunds via Google Play{'\n'}
        • China payments (WeChat Pay/Alipay): refunds available within 7 days of purchase if used less than 1 hour. Contact support@hearclear.app
      </Text>

      <Text style={styles.section}>Price Changes</Text>
      <Text style={styles.body}>
        We will notify you at least 30 days before any price changes. Current subscription periods are not affected by price changes.
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

/**
 * 延迟测试说明页
 *
 * 端到端延迟测量方法见 docs/latency-and-vad-roadmap.md。
 * 后续可在此实现 App 内 beep 回放测延迟（需注意 AEC 会压低自播 beep）。
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity } from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@constants/theme';

export default function LatencyTestScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isZh = i18n.language === 'zh';

  return (
    <>
      <Stack.Screen
        options={{
          title: isZh ? '延迟测试' : 'Latency Test',
          headerShown: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: SPACING.sm }}>
              <Text style={{ color: COLORS.primary, fontSize: FONT_SIZE.md }}>{t('common.back')}</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>
            {isZh ? '如何测量端到端延迟' : 'How to measure end-to-end latency'}
          </Text>
          <Text style={styles.paragraph}>
            {isZh
              ? '1. 在安静环境连接耳机，开启助听。'
              : '1. In a quiet environment, connect headphones and start hearing aid.'}
          </Text>
          <Text style={styles.paragraph}>
            {isZh
              ? '2. 在麦克风旁拍一次手或播放短促点击声。'
              : '2. Clap once near the microphone or play a short click.'}
          </Text>
          <Text style={styles.paragraph}>
            {isZh
              ? '3. 用另一台设备同时录下「现场原声 + 耳机播放出的声音」。'
              : '3. Use another device to record both the original sound and the sound from the headphones.'}
          </Text>
          <Text style={styles.paragraph}>
            {isZh
              ? '4. 在音频软件（如 Audacity）中对齐两段波形的峰值，时间差即为端到端延迟（ms）。'
              : '4. In an audio editor (e.g. Audacity), align the peaks of both waveforms; the time difference is the end-to-end latency (ms).'}
          </Text>
          <Text style={[styles.paragraph, styles.note]}>
            {isZh
              ? '目标：通常 < 150 ms 或 < 100 ms 可接受，以实测与听感为准。当前门控 FFT 已改为 512 以降低延迟。'
              : 'Target: typically < 150 ms or < 100 ms is acceptable; verify with your device and listening. Gate FFT is set to 512 for lower latency.'}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  paragraph: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 22,
  },
  note: {
    marginTop: SPACING.lg,
    color: COLORS.text,
  },
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { useAudioStore } from '@stores/audio-store';
import { useSubscriptionStore } from '@stores/subscription-store';
import { useConfigStore } from '@stores/config-store';
import { HeadphoneMode, AUDIO_CONFIG, OUTPUT_DEVICE_OPTIONS } from '@config/audio';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '@constants/theme';

import Constants from 'expo-constants';
import { AudioEngine } from '@services/audio/AudioEngine';
import { useAudioPermission } from '@hooks/useAudioPermission';
import { useHeadphoneDetection } from '@hooks/useHeadphoneDetection';
import { useAudioAnalyser } from '@hooks/useAudioAnalyser';
import {
  initBackgroundService,
  startBackgroundAudio,
  stopBackgroundAudio,
} from '@services/background-audio';
import { persistFeedbackCorrection } from '@services/hearing-test/feedbackCorrection';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

// ─── 双频谱组件 ──────────────────────────────────────────────────────────────
const BARS = 28;
const BAR_MAX_H = 44; // 单侧最大高度 px

function DualSpectrum() {
  const { voiceBars, envBars } = useAudioAnalyser(BARS);

  return (
    <View style={specStyles.wrap}>
      {/* 标签：上=环境音，下=人声（与条对应一致） */}
      <View style={specStyles.labelRow}>
        <Text style={[specStyles.label, { color: COLORS.warning }]}>环境音</Text>
        <Text style={[specStyles.label, { color: COLORS.success }]}>人声</Text>
      </View>

      {/* 双频谱区域 */}
      <View style={specStyles.specWrap}>
        {/* 环境音（朝上） */}
        <View style={specStyles.halfUp}>
          <View style={specStyles.barsUp}>
            {envBars.map((v, i) => (
              <View
                key={i}
                style={[
                  specStyles.barUp,
                  {
                    height: Math.max(2, v * BAR_MAX_H),
                    backgroundColor: COLORS.warning,
                    opacity: 0.2 + v * 0.8,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* 中间分割线 + 频率标注 */}
        <View style={specStyles.centerLine}>
          <View style={specStyles.line} />
          <View style={specStyles.freqLabels}>
            {['100', '500', '1k', '2k', '4k', '8k'].map((f) => (
              <Text key={f} style={specStyles.freqTxt}>{f}</Text>
            ))}
          </View>
        </View>

        {/* 人声（朝下） */}
        <View style={specStyles.halfDown}>
          <View style={specStyles.barsDown}>
            {voiceBars.map((v, i) => (
              <View
                key={i}
                style={[
                  specStyles.barDown,
                  {
                    height: Math.max(2, v * BAR_MAX_H),
                    backgroundColor: COLORS.success,
                    opacity: 0.25 + v * 0.75,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const specStyles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  specWrap: { gap: 0 },

  // 环境音（上半）
  halfUp: { height: BAR_MAX_H, justifyContent: 'flex-end' },
  barsUp: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: BAR_MAX_H,
    gap: 1.5,
  },
  barUp: { flex: 1, borderRadius: 1.5, maxWidth: 9 },

  // 分割线 + 频率
  centerLine: { paddingVertical: 4 },
  line: { height: 1, backgroundColor: COLORS.border },
  freqLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  freqTxt: { fontSize: 9, color: COLORS.textMuted, fontVariant: ['tabular-nums'] },

  // 人声（下半）
  halfDown: { height: BAR_MAX_H, justifyContent: 'flex-start' },
  barsDown: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    height: BAR_MAX_H,
    gap: 1.5,
  },
  barDown: { flex: 1, borderRadius: 1.5, maxWidth: 9 },
});

// ─── 科技感主按钮 ─────────────────────────────────────────────────────────────
const BTN = 152;
const RING1 = BTN + 30;
const RING2 = BTN + 62;
const RING3 = BTN + 100;  // 扩散基准尺寸

type BtnStatus = 'idle' | 'starting' | 'running' | 'stopping';

function SciFiPowerButton({ status, onPress }: { status: BtnStatus; onPress: () => void }) {
  const isRunning = status === 'running';
  const isStarting = status === 'starting' || status === 'stopping';

  // ── 始终运行的动画值 ────────────────────────────────────────────────────────
  const rotA = useSharedValue(0);      // 顺时针外环
  const rotB = useSharedValue(0);      // 逆时针中环
  const breathe = useSharedValue(0);   // 光晕呼吸 0~1

  // ── 激活时的动画值 ─────────────────────────────────────────────────────────
  const expandA = useSharedValue(0);   // 扩散环A
  const expandB = useSharedValue(0);   // 扩散环B（错相）
  const innerScale = useSharedValue(1);
  const scanLine = useSharedValue(0);  // 扫描线 0→1

  // ── 计时器 ref（用于错相扩散） ────────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }

    if (isRunning) {
      // 顺时针：快速旋转
      rotA.value = withRepeat(withTiming(360, { duration: 4000, easing: Easing.linear }), -1, false);
      // 逆时针：中速旋转
      rotB.value = withRepeat(withTiming(-360, { duration: 7000, easing: Easing.linear }), -1, false);
      // 呼吸：强烈
      breathe.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.55, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        ),
        -1, false
      );
      // 扩散环A：立即开始
      expandA.value = 0;
      expandA.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false);
      // 扩散环B：错开1100ms（半个周期）
      timerRef.current = setTimeout(() => {
        expandB.value = 0;
        expandB.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false);
      }, 1100);
      // 内圈缩放
      innerScale.value = withRepeat(
        withSequence(
          withTiming(1.07, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        ),
        -1, false
      );
      // 扫描线
      scanLine.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.linear }), -1, false);

    } else if (isStarting) {
      rotA.value = withRepeat(withTiming(360, { duration: 1600, easing: Easing.linear }), -1, false);
      rotB.value = withRepeat(withTiming(-360, { duration: 2400, easing: Easing.linear }), -1, false);
      breathe.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 400 }),
          withTiming(0.3, { duration: 400 }),
        ),
        -1, false
      );
      expandA.value = withTiming(0, { duration: 300 });
      expandB.value = withTiming(0, { duration: 300 });
      innerScale.value = withTiming(1, { duration: 200 });

    } else {
      // ── idle：慢速旋转 + 常驻呼吸光晕
      rotA.value = withRepeat(withTiming(360, { duration: 20000, easing: Easing.linear }), -1, false);
      rotB.value = withRepeat(withTiming(-360, { duration: 30000, easing: Easing.linear }), -1, false);
      breathe.value = withRepeat(
        withSequence(
          withTiming(0.38, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.1, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1, false
      );
      expandA.value = withTiming(0, { duration: 600 });
      expandB.value = withTiming(0, { duration: 600 });
      innerScale.value = withTiming(1, { duration: 400 });
      scanLine.value = withTiming(0, { duration: 300 });
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isRunning, isStarting]);

  // ── 动画样式 ──────────────────────────────────────────────────────────────
  const rotAStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotA.value}deg` }],
  }));
  const rotBStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotB.value}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: breathe.value,
    transform: [{ scale: 0.9 + breathe.value * 0.1 }],
  }));
  // 扩散环：从 RING2 扩展到 RING3，同时透明度从 0.7 降到 0
  const expandAStyle = useAnimatedStyle(() => {
    const s = 1 + expandA.value * 0.55;
    return { opacity: (1 - expandA.value) * 0.75, transform: [{ scale: s }] };
  });
  const expandBStyle = useAnimatedStyle(() => {
    const s = 1 + expandB.value * 0.55;
    return { opacity: (1 - expandB.value) * 0.75, transform: [{ scale: s }] };
  });
  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerScale.value }],
  }));
  const scanStyle = useAnimatedStyle(() => ({
    opacity: isRunning ? 0.35 : 0,
    transform: [{ rotate: `${scanLine.value * 360}deg` }],
  }));

  const accent = isRunning ? COLORS.success : isStarting ? COLORS.warning : COLORS.primary;
  const innerBg: [string, string] = isRunning
    ? ['#001F12', '#003820']
    : isStarting
      ? ['#251A00', '#3C2900']
      : ['#03101F', '#071E38'];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.btnTouchable}>

      {/* ── 背景光晕（常驻，idle 时微弱，running 时强烈） */}
      <Animated.View style={[styles.bgGlow, { shadowColor: accent }, glowStyle]}>
        <View style={[styles.bgGlowInner, { backgroundColor: `${accent}18` }]} />
      </Animated.View>

      {/* ── 扩散环A（running 专属） */}
      <Animated.View style={[styles.expandRing, { borderColor: `${accent}CC` }, expandAStyle]} />

      {/* ── 扩散环B（running 专属，错相） */}
      <Animated.View style={[styles.expandRing, { borderColor: `${accent}88` }, expandBStyle]} />

      {/* ── 外旋转环（顺时针）：细线分段 */}
      <Animated.View style={[styles.outerRing, rotAStyle]}>
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i / 24) * 2 * Math.PI;
          const r = RING2 / 2 - 3;
          const x = Math.cos(angle - Math.PI / 2) * r + RING2 / 2;
          const y = Math.sin(angle - Math.PI / 2) * r + RING2 / 2;
          const isMajor = i % 6 === 0;
          const isMid = i % 3 === 0;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                width: isMajor ? 6 : isMid ? 4 : 2,
                height: isMajor ? 6 : isMid ? 4 : 2,
                borderRadius: 3,
                backgroundColor: isMajor ? accent : `${accent}${isMid ? 'BB' : '55'}`,
                left: x - (isMajor ? 3 : isMid ? 2 : 1),
                top: y - (isMajor ? 3 : isMid ? 2 : 1),
              }}
            />
          );
        })}
      </Animated.View>

      {/* ── 中旋转环（逆时针）：虚线弧 */}
      <Animated.View style={[styles.innerRotRing, rotBStyle]}>
        {[0, 90, 180, 270].map((deg) => (
          <View
            key={deg}
            style={[
              styles.arcSeg,
              {
                borderColor: accent,
                opacity: isRunning ? 0.85 : isStarting ? 0.6 : 0.22,
                transform: [{ rotate: `${deg}deg` }],
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* ── 扫描线（running 时旋转一条射线） */}
      <Animated.View style={[styles.scanWrap, scanStyle]}>
        <View style={[styles.scanLine, { backgroundColor: accent }]} />
      </Animated.View>

      {/* ── 固定中层环 */}
      <View style={[styles.fixedMidRing, { borderColor: `${accent}44` }]} />

      {/* ── 内层脉冲环 */}
      <Animated.View style={[styles.fixedInnerRing, { borderColor: accent }, innerStyle]} />

      {/* ── 主圆按钮 */}
      <LinearGradient
        colors={innerBg}
        style={[styles.mainCircle, { shadowColor: accent, shadowOpacity: isRunning ? 1 : 0.45 }]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
      >
        {/* 顶部高光 */}
        <View style={styles.btnHighlight} />

        {/* 电源图标 */}
        <View style={styles.powerWrap}>
          <View style={[styles.powerArc, { borderColor: accent }]} />
          <View style={[styles.powerLine, { backgroundColor: accent }]} />
        </View>

        {/* 状态文字 */}
        <Text style={[styles.btnStatus, { color: accent }]}>
          {status === 'running' ? 'ACTIVE' : status === 'starting' ? 'STARTING' : status === 'stopping' ? 'STOPPING' : 'STANDBY'}
        </Text>
      </LinearGradient>

      {/* ── 底部标签 */}
      <Text style={[styles.btnLabel, { color: accent }]}>
        {status === 'running' ? '点击停止' : '点击开始助听'}
      </Text>
    </TouchableOpacity>
  );
}

// ─── 简单滑块：无动画，直接跟随触摸 ─────────────────────────────────────────
const THUMB_SIZE = 28;
const TRACK_H = 6;

function SimpleSlider({
  icon, label, value, onChange, disabled = false, displayMax = 100, color = COLORS.primary,
}: {
  icon: string; label: string; value: number;
  onChange: (v: number) => void;
  disabled?: boolean; displayMax?: number; color?: string;
}) {
  const trackWidthRef = useRef(0);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const displayPct = Math.round(value * displayMax);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderGrant: (e) => {
        if (disabledRef.current || trackWidthRef.current <= 0) return;
        const x = e.nativeEvent.locationX;
        const v = Math.max(0, Math.min(1, x / trackWidthRef.current));
        onChange(v);
      },
      onPanResponderMove: (e) => {
        if (disabledRef.current || trackWidthRef.current <= 0) return;
        const x = e.nativeEvent.locationX;
        const v = Math.max(0, Math.min(1, x / trackWidthRef.current));
        onChange(v);
      },
    })
  ).current;

  return (
    <View style={[sliderStyles.row, disabled && sliderStyles.disabled]}>
      <View style={sliderStyles.header}>
        <Text style={sliderStyles.icon}>{icon}</Text>
        <Text style={sliderStyles.label}>{label}</Text>
        <Text style={[sliderStyles.value, { color }]} accessible accessibilityLabel={`${label} ${displayPct}%`}>
          {displayPct}%
        </Text>
      </View>

      <View
        style={sliderStyles.trackWrap}
        onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width; }}
        {...pan.panHandlers}
      >
        <View style={sliderStyles.trackBg} pointerEvents="none" />
        <View
          style={[
            sliderStyles.trackFill,
            {
              width: `${value * 100}%` as `${number}%`,
              backgroundColor: color,
              shadowColor: color,
            },
          ]}
          pointerEvents="none"
        />
        {[0.25, 0.5, 0.75].map((v) => (
          <View
            key={String(v)}
            style={[
              sliderStyles.tick,
              { left: `${v * 100}%` as `${number}%`, backgroundColor: value >= v ? color : COLORS.border },
            ]}
            pointerEvents="none"
          />
        ))}
        <View
          style={[
            sliderStyles.thumbHit,
            { left: `${value * 100}%` as `${number}%`, transform: [{ translateX: -(THUMB_SIZE + 16) / 2 }] },
          ]}
          pointerEvents="none"
        >
          <View style={[sliderStyles.thumbOuter, { borderColor: color }]}>
            <View style={[sliderStyles.thumbInner, { backgroundColor: color }]} />
          </View>
        </View>
      </View>

      <View style={sliderStyles.rangeRow}>
        <Text style={sliderStyles.rangeLabel}>0%</Text>
        <Text style={sliderStyles.rangeLabel}>{displayMax}%</Text>
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  row: { marginBottom: 22, overflow: 'hidden' },
  disabled: { opacity: 0.35 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  icon: { fontSize: 18 },
  label: { flex: 1, fontSize: 14, color: COLORS.textSecondary },
  value: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'], minWidth: 44, maxWidth: 56, textAlign: 'right' },

  trackWrap: {
    height: THUMB_SIZE + 20,
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: (THUMB_SIZE + 16) / 2,
  },
  trackBg: {
    position: 'absolute',
    left: 0, right: 0,
    height: TRACK_H,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: TRACK_H / 2,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  tick: {
    position: 'absolute',
    width: 2,
    height: 12,
    borderRadius: 1,
    top: (THUMB_SIZE + 20 - 12) / 2,
    marginLeft: -1,
  },
  thumbHit: {
    position: 'absolute',
    width: THUMB_SIZE + 16,
    height: THUMB_SIZE + 16,
    top: (THUMB_SIZE + 20 - THUMB_SIZE - 16) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbGlow: {
    position: 'absolute',
    width: THUMB_SIZE + 14,
    height: THUMB_SIZE + 14,
    borderRadius: (THUMB_SIZE + 14) / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.6,
    elevation: 0,
  },
  thumbOuter: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D1526',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    shadowOpacity: 0.8,
    elevation: 8,
  },
  thumbInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rangeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  rangeLabel: { fontSize: 10, color: COLORS.textMuted },
});

// ─── 运行中音量反馈：太大声/太小声/刚好 + 可展开低/中/高（dB）────────────────────
const FEEDBACK_STEP_DB = 2;
const BAND_MIN = -6;
const BAND_MAX = 6;

function FeedbackCorrectionPanel({
  params,
  updateFeedbackCorrection,
  persistFeedbackCorrection,
}: {
  params: import('@types/audio').AudioParams;
  updateFeedbackCorrection: (p: Partial<import('@types/audiogram').FeedbackCorrection>) => void;
  persistFeedbackCorrection: (fc: import('@types/audiogram').FeedbackCorrection) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [advanced, setAdvanced] = useState(false);
  const fc = params.feedbackCorrection ?? { overall: 0, low: 0, mid: 0, high: 0 };

  const apply = useCallback(
    (partial: Partial<typeof fc>) => {
      updateFeedbackCorrection(partial);
      const next = { ...fc, ...partial };
      persistFeedbackCorrection(next).catch(() => {});
    },
    [fc, updateFeedbackCorrection, persistFeedbackCorrection]
  );

  return (
    <View style={feedbackStyles.panel}>
      <View style={feedbackStyles.card}>
        <View style={feedbackStyles.cardTopAccent} />
        <Text style={feedbackStyles.title}>{t('feedbackCorrection.title')}</Text>
        <View style={feedbackStyles.row}>
          <TouchableOpacity
            style={[feedbackStyles.btn, feedbackStyles.btnLoud]}
            onPress={() => apply({ overall: Math.max(-6, (fc.overall ?? 0) - FEEDBACK_STEP_DB) })}
          >
            <Text style={feedbackStyles.btnText}>{t('feedbackCorrection.tooLoud')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[feedbackStyles.btn, feedbackStyles.btnJust]}
            onPress={() => apply({ overall: 0 })}
          >
            <Text style={feedbackStyles.btnText}>{t('feedbackCorrection.justRight')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[feedbackStyles.btn, feedbackStyles.btnQuiet]}
            onPress={() => apply({ overall: Math.min(6, (fc.overall ?? 0) + FEEDBACK_STEP_DB) })}
          >
            <Text style={feedbackStyles.btnText}>{t('feedbackCorrection.tooQuiet')}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={feedbackStyles.advancedToggle}
          onPress={() => setAdvanced((a) => !a)}
        >
          <Text style={feedbackStyles.advancedToggleText}>
            {t('feedbackCorrection.advanced')} {advanced ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>
        {advanced && (
          <View style={feedbackStyles.sliders}>
            {(['low', 'mid', 'high'] as const).map((band) => {
              const val = fc[band] ?? 0;
              return (
                <View key={band} style={feedbackStyles.sliderRow}>
                  <Text style={feedbackStyles.sliderLabel}>{t(`feedbackCorrection.${band}`)}</Text>
                  <TouchableOpacity
                    style={feedbackStyles.bandBtn}
                    onPress={() => apply({ [band]: Math.max(BAND_MIN, val - 1) })}
                  >
                    <Text style={feedbackStyles.bandBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={feedbackStyles.sliderValue}>{val} dB</Text>
                  <TouchableOpacity
                    style={feedbackStyles.bandBtn}
                    onPress={() => apply({ [band]: Math.min(BAND_MAX, val + 1) })}
                  >
                    <Text style={feedbackStyles.bandBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const feedbackStyles = StyleSheet.create({
  panel: { marginBottom: 14 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    overflow: 'hidden',
  },
  cardTopAccent: {
    position: 'absolute',
    top: 0, left: 14, right: 14,
    height: 1,
    backgroundColor: COLORS.primary,
    opacity: 0.35,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnLoud: { backgroundColor: COLORS.danger + '30', borderWidth: 1, borderColor: COLORS.danger },
  btnJust: { backgroundColor: COLORS.success + '30', borderWidth: 1, borderColor: COLORS.success },
  btnQuiet: { backgroundColor: COLORS.primary + '30', borderWidth: 1, borderColor: COLORS.primary },
  btnText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  advancedToggle: { paddingVertical: 6 },
  advancedToggleText: { fontSize: 12, color: COLORS.primary },
  sliders: { marginTop: 8, gap: 6 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderLabel: { fontSize: 12, color: COLORS.textSecondary, minWidth: 36 },
  bandBtn: { width: 32, height: 28, borderRadius: 6, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  bandBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  sliderValue: { fontSize: 11, color: COLORS.textMuted, minWidth: 36 },
});

// ─── 首页 ─────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const {
    status, params, configLocked, feedbackFrequency, error,
    setStatus, setError, updateParams, setHeadphoneConnected,
    updateFeedbackCorrection,
  } = useAudioStore();

  const { showPaywall, isPaid, isInTrial, trialDaysRemaining } = useSubscriptionStore();
  const { isOfflineMode } = useConfigStore();
  const { requestPermission } = useAudioPermission();
  const { isConnected: headphoneConnected } = useHeadphoneDetection();

  const prevConnected = useRef(headphoneConnected);
  const hasAutoStarted = useRef(false);

  // ── 初始化后台服务
  useEffect(() => { initBackgroundService().catch(() => {}); }, []);

  // ── 同步耳机状态到 store + 自动切换模式 + 无耳机时静音输出（继续采集）
  useEffect(() => {
    setHeadphoneConnected(headphoneConnected);

    const was = prevConnected.current;
    prevConnected.current = headphoneConnected;

    if (params.headphoneMode === HeadphoneMode.SPEAKER) {
      updateParams({ headphoneMode: HeadphoneMode.NORMAL });
    }
    if (!headphoneConnected && was) {
      updateParams({ headphoneMode: HeadphoneMode.NORMAL });
    }
    // 无耳机时：只采集不输出
    if (status === 'running') {
      AudioEngine.setOutputMuted(!headphoneConnected);
    }
  }, [headphoneConnected, status]);

  // ── 进入首页时自动开启引擎（无需再点一次）；包一层 try/catch 避免未捕获错误导致红屏
  useEffect(() => {
    if (hasAutoStarted.current) return;
    hasAutoStarted.current = true;

    const doAutoStart = async () => {
      try {
        const { status: s } = useAudioStore.getState();
        if (s === 'running' || s === 'starting') return;
        if (useSubscriptionStore.getState().showPaywall) return;

        const ok = await requestPermission();
        if (!ok) return;

        setStatus('starting');
        setError(null);
        const latestParams = useAudioStore.getState().params;
        const result = await AudioEngine.start(latestParams);
        if (result.error) {
          setStatus('error');
          setError(result.error);
        } else {
          setStatus('running');
          const connected = useAudioStore.getState().headphoneConnected;
          AudioEngine.setOutputMuted(!connected);
          await startBackgroundAudio().catch(() => {});
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : '启动失败，请重试';
        setStatus('error');
        setError(msg);
      }
    };

    doAutoStart();
  }, []);

  const isRunning = status === 'running';
  const isStarting = status === 'starting';
  const isBone = params.headphoneMode === HeadphoneMode.BONE_CONDUCTION;
  const maxGain = isBone
    ? AUDIO_CONFIG.MAX_GAIN_BONE_CONDUCTION
    : AUDIO_CONFIG.MAX_GAIN_NORMAL;
  const gainPct = params.gain / maxGain;
  /** 助听：100% = 2 倍（6 dB），显示刻度 0%～(maxGain/6)*100% */
  const gainDisplayMaxPct = Math.round((maxGain / 6) * 100);

  // ── 开始/停止
  const handleToggle = useCallback(async () => {
    if (showPaywall) { router.push('/paywall'); return; }

    if (isRunning || isStarting) {
      setStatus('stopping');
      await AudioEngine.stop();
      await stopBackgroundAudio().catch(() => {});
      setStatus('idle');
      return;
    }

    const ok = await requestPermission();
    if (!ok) return;

    setStatus('starting');
    setError(null);
    const latestParams = useAudioStore.getState().params;
    const result = await AudioEngine.start(latestParams);
    if (result.error) {
      setStatus('error');
      setError(result.error);
    } else {
      setStatus('running');
      AudioEngine.setOutputMuted(!headphoneConnected);
      await startBackgroundAudio().catch(() => {});
    }
  }, [isRunning, isStarting, headphoneConnected, params, showPaywall]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#040810', '#060D1E']} style={StyleSheet.absoluteFill} />
      {/* 顶部科技感光晕 */}
      <LinearGradient
        colors={['rgba(56,189,248,0.12)', 'rgba(56,189,248,0.02)', 'transparent']}
        style={styles.rootGlow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── 顶部栏 */}
          <View style={styles.topBar}>
            <View style={styles.topBarRow}>
              <View style={styles.topBarLeft}>
                <Text style={styles.appName}>HEAR CLEAR</Text>
                <Text style={styles.appSub}>AI 助听系统</Text>
              </View>
              <View style={styles.topBadges}>
              {isOfflineMode && <View style={[styles.badge, { borderColor: COLORS.warning }]}><Text style={[styles.badgeText, { color: COLORS.warning }]}>OFFLINE</Text></View>}
              {isPaid && <View style={[styles.badge, { borderColor: COLORS.success }]}><Text style={[styles.badgeText, { color: COLORS.success }]}>PRO</Text></View>}
            </View>
            </View>
            <View style={styles.topBarAccentLine} />
          </View>

          {/* ── 耳机/外放状态提示：无耳机时醒目提示，继续采集不输出 */}
          {headphoneConnected ? (
            <View style={styles.statusHintRow}>
              <Text style={[styles.statusHintText, { color: COLORS.success }]}>
                🎧 已连接耳机
              </Text>
            </View>
          ) : (
            <View style={styles.noHeadphoneBanner}>
              <Text style={styles.noHeadphoneBannerTitle}>📢 未连接耳机</Text>
              <Text style={styles.noHeadphoneBannerDesc}>当前仅采集不输出声音，连接耳机后可听到增强后的声音。</Text>
            </View>
          )}

          {/* ── 输出设备选择（仅耳机 / 骨传导，无外放） */}
          <View style={styles.deviceCard}>
            <View style={styles.cardTopAccent} />
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionTitleBar, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.deviceCardTitle}>输出设备</Text>
            </View>
            <View style={styles.deviceBtnRow}>
              {OUTPUT_DEVICE_OPTIONS.map((mode) => {
                const { icon, label, color } = mode === HeadphoneMode.NORMAL
                  ? { icon: '🎧' as const, label: '耳机',   color: COLORS.success }
                  : { icon: '🦴' as const, label: '骨传导', color: COLORS.warning };
                const active = params.headphoneMode === mode;
                return (
                  <TouchableOpacity
                    key={String(mode)}
                    style={[
                      styles.deviceBtn,
                      active && { borderColor: color, backgroundColor: `${color}18` },
                      configLocked && styles.deviceBtnDisabled,
                    ]}
                    onPress={() => !configLocked && updateParams({ headphoneMode: mode })}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.deviceBtnIcon}>{icon}</Text>
                    <Text style={[styles.deviceBtnLabel, active && { color }]}>{label}</Text>
                    {active && <View style={[styles.deviceBtnDot, { backgroundColor: color }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── 主按钮区 */}
          <View style={styles.btnZone}>
            <SciFiPowerButton
              status={status as BtnStatus}
              onPress={handleToggle}
            />
          </View>

          {/* ── 双频谱（人声 / 环境音）*/}
          <DualSpectrum />
          <Text style={styles.spectrumHint}>环境音向上，人声向下；100Hz～8kHz</Text>

          {/* ── 运行中：音量反馈修正（太大声/太小声/刚好 + 可展开低/中/高）*/}
          {isRunning && (
            <FeedbackCorrectionPanel
              params={params}
              updateFeedbackCorrection={updateFeedbackCorrection}
              persistFeedbackCorrection={persistFeedbackCorrection}
            />
          )}

          {/* ── 反馈抑制提示 */}
          {feedbackFrequency != null && (
            <View style={styles.alertRow}>
              <Text style={styles.alertTxt}>
                检测到啸叫（约 {Math.round(feedbackFrequency)} Hz），已自动抑制。若持续存在请调整耳机佩戴或降低音量。
              </Text>
            </View>
          )}

          {/* ── 启动失败错误展示 */}
          {status === 'error' && error && (
            <View style={styles.errorRow}>
              <Text style={styles.errorTxt}>{error.message ?? t('home.errors.engineError')}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => { setError(null); setStatus('idle'); }}
              >
                <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── 试用提示 */}
          {isInTrial && !isPaid && (
            <TouchableOpacity style={styles.trialRow} onPress={() => router.push('/paywall')}>
              <Text style={styles.trialTxt}>🎁 试用期剩余 {trialDaysRemaining} 天 · 升级解锁全功能</Text>
            </TouchableOpacity>
          )}

          {/* ── 音效参数 */}
          <View style={styles.paramsCard}>
            <View style={styles.cardTopAccent} />
            <View style={styles.paramsHead}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionTitleBar, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.paramsTitle}>[ 音效参数 ]</Text>
              </View>
              {configLocked && <Text style={styles.lockedTxt}>🔒 离线锁定</Text>}
            </View>
            <SimpleSlider
              icon="🔊" label="音量增益" value={gainPct} displayMax={gainDisplayMaxPct}
              color={COLORS.primary}
              disabled={configLocked}
              onChange={(v) => updateParams({ gain: v * maxGain })}
            />
            <SimpleSlider
              icon="🎙" label="人声增强" value={params.voiceEnhance}
              color={COLORS.success}
              disabled={configLocked}
              onChange={(v) => updateParams({ voiceEnhance: v })}
            />
            <SimpleSlider
              icon="🌿" label="环境降噪" value={params.noiseGate}
              color={COLORS.warning}
              disabled={configLocked}
              onChange={(v) => updateParams({ noiseGate: v })}
            />
          </View>

          {/* ── Expo Go 说明 */}
          {IS_EXPO_GO && (
            <View style={styles.expoGoCard}>
              <Text style={styles.expoGoTitle}>⚠️ Expo Go 演示模式</Text>
              <Text style={styles.expoGoBody}>
                当前运行在 Expo Go，无法进行实际的音频处理，{'\n'}
                耳机不会有声音输出。{'\n\n'}
                要体验完整助听功能，需要构建 Dev Build：{'\n'}
                <Text style={styles.expoGoCode}>npx expo run:android</Text>
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── 样式 ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  rootGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 320,
    pointerEvents: 'none',
  },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },

  // 顶栏
  topBar: { marginBottom: 20 },
  topBarRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  topBarLeft: {},
  topBarAccentLine: {
    height: 1,
    marginTop: 10,
    backgroundColor: COLORS.primary,
    opacity: 0.4,
    borderRadius: 1,
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 4,
    textShadowColor: COLORS.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  appSub: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2, marginTop: 2 },
  topBadges: { flexDirection: 'row', gap: 8, marginTop: 4 },
  badge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  // 卡片顶边高光 + 区块标题
  cardTopAccent: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    height: 1,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: COLORS.primary,
    opacity: 0.35,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitleBar: { width: 3, height: 12, borderRadius: 2 },
  // 设备选择卡
  deviceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 20,
    overflow: 'hidden',
  },
  deviceCardTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 2.5,
    marginBottom: 12,
  },
  deviceBtnRow: { flexDirection: 'row', gap: 8 },
  deviceBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
    gap: 4,
    position: 'relative',
  },
  deviceBtnDisabled: { opacity: 0.45 },
  deviceBtnIcon: { fontSize: 22 },
  deviceBtnLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  deviceBtnDot: {
    position: 'absolute',
    bottom: 6,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  deviceMismatchHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 10,
    textAlign: 'center',
  },
  statusHintRow: { marginBottom: 8 },
  statusHintText: { fontSize: 12 },
  noHeadphoneBanner: {
    backgroundColor: COLORS.warningDim,
    borderWidth: 1,
    borderColor: COLORS.warning,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  noHeadphoneBannerTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.warning,
    marginBottom: 4,
  },
  noHeadphoneBannerDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  // 按钮区
  btnZone: { alignItems: 'center', marginBottom: 8, marginTop: 4 },
  btnTouchable: { alignItems: 'center', width: RING3 + 16, gap: 14 },

  // 背景光晕（常驻）
  bgGlow: {
    position: 'absolute',
    top: (RING3 + 16 - RING3 - 20) / 2,
    left: -2,
    width: RING3 + 20,
    height: RING3 + 20,
    borderRadius: (RING3 + 20) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 40,
    shadowOpacity: 0.9,
    elevation: 0,
  },
  bgGlowInner: {
    width: RING3 + 20,
    height: RING3 + 20,
    borderRadius: (RING3 + 20) / 2,
  },

  // 扩散环（从 RING2 大小扩散出去）
  expandRing: {
    position: 'absolute',
    top: (RING3 + 16 - RING2) / 2,
    left: (RING3 + 16 - RING2) / 2,
    width: RING2,
    height: RING2,
    borderRadius: RING2 / 2,
    borderWidth: 1.5,
  },

  // 外旋转环
  outerRing: {
    width: RING2,
    height: RING2,
    position: 'relative',
  },

  // 中旋转环（逆时针）
  innerRotRing: {
    position: 'absolute',
    top: (RING3 + 16 - RING1) / 2,
    left: (RING3 + 16 - RING1) / 2,
    width: RING1,
    height: RING1,
  },
  arcSeg: {
    position: 'absolute',
    top: 6,
    left: RING1 / 2 - 1,
    width: 2,
    height: 18,
    borderTopWidth: 2,
    borderColor: 'transparent',
    transformOrigin: `1px ${RING1 / 2 - 6}px`,
  },

  // 扫描线
  scanWrap: {
    position: 'absolute',
    top: (RING3 + 16 - RING2) / 2,
    left: (RING3 + 16 - RING2) / 2,
    width: RING2,
    height: RING2,
    transformOrigin: `${RING2 / 2}px ${RING2 / 2}px`,
  },
  scanLine: {
    position: 'absolute',
    top: RING2 / 2,
    left: BTN / 2 + 8,
    width: RING2 / 2 - BTN / 2 - 8,
    height: 1,
    opacity: 0.6,
  },

  // 固定中层环
  fixedMidRing: {
    position: 'absolute',
    top: (RING3 + 16 - RING1) / 2,
    left: (RING3 + 16 - RING1) / 2,
    width: RING1,
    height: RING1,
    borderRadius: RING1 / 2,
    borderWidth: 1,
  },

  // 内层脉冲环
  fixedInnerRing: {
    position: 'absolute',
    top: (RING3 + 16 - BTN - 18) / 2,
    left: (RING3 + 16 - BTN - 18) / 2,
    width: BTN + 18,
    height: BTN + 18,
    borderRadius: (BTN + 18) / 2,
    borderWidth: 2,
  },

  // 主圆
  mainCircle: {
    position: 'absolute',
    top: (RING3 + 16 - BTN) / 2,
    left: (RING3 + 16 - BTN) / 2,
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 32,
    elevation: 16,
    gap: 6,
  },
  btnHighlight: {
    position: 'absolute',
    top: 14,
    width: BTN * 0.48,
    height: BTN * 0.15,
    borderRadius: BTN * 0.075,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },

  // 电源图标
  powerWrap: { alignItems: 'center', justifyContent: 'center', width: 52, height: 52 },
  powerArc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3.5,
    borderTopColor: 'transparent',
    position: 'absolute',
  },
  powerLine: {
    position: 'absolute',
    top: 2,
    width: 3.5,
    height: 19,
    borderRadius: 2,
  },
  btnStatus: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 3.5,
    marginTop: 2,
  },
  btnLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    textAlign: 'center',
  },

  // 提示行
  alertRow: {
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  alertTxt: { color: COLORS.error, fontSize: 12 },
  spectrumHint: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: -8,
    marginBottom: 14,
    textAlign: 'center',
  },
  errorRow: {
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  errorTxt: { color: COLORS.error, fontSize: 12, marginBottom: 8 },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  trialRow: {
    backgroundColor: 'rgba(56,189,248,0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  trialTxt: { color: COLORS.primary, fontSize: 12 },

  // 参数卡
  paramsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 12,
    overflow: 'hidden',
  },
  paramsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  paramsTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2 },
  lockedTxt: { fontSize: 11, color: COLORS.warning },


  // Expo Go 提示卡
  expoGoCard: {
    backgroundColor: 'rgba(251,191,36,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
    padding: 16,
    marginBottom: 8,
  },
  expoGoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.warning,
    marginBottom: 8,
  },
  expoGoBody: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  expoGoCode: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: COLORS.primary,
    backgroundColor: 'rgba(56,189,248,0.12)',
  },
});

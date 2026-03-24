import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  PanResponder,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  interpolate,
  SensorType,
  type SharedValue,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedSensor,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';
import type { AudioParams } from '@/types/audio';
import type { FeedbackCorrection } from '@/types/audiogram';

import { useAudioStore } from '@stores/audio-store';
import { useSubscriptionStore } from '@stores/subscription-store';
import { useConfigStore } from '@stores/config-store';
import { HeadphoneMode, AUDIO_CONFIG, OUTPUT_DEVICE_OPTIONS } from '@config/audio';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS, SHADOW } from '@constants/theme';

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
import { reportError } from '@utils/error-report';
import { ScreenBackdrop } from '@components/ui/ScreenBackdrop';

const IS_EXPO_GO = Constants.appOwnership === 'expo';
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
type RotationSensorValue = { value: { pitch?: number; roll?: number } };
type DeviceTiltProps = {
  sensorEnabled?: boolean;
  sensorValue?: RotationSensorValue;
};

type DepthFrameProps = DeviceTiltProps & {
  accent?: string;
  children: React.ReactNode;
  depth?: 'hero' | 'panel';
  radius: number;
  style?: StyleProp<ViewStyle>;
};

function DepthFrame({
  accent = COLORS.primary,
  children,
  depth = 'panel',
  radius,
  sensorEnabled = false,
  sensorValue,
  style,
}: DepthFrameProps) {
  const sway = useSharedValue(0);
  const float = useSharedValue(0);
  const sweep = useSharedValue(0);
  const touchX = useSharedValue(0);
  const touchY = useSharedValue(0);
  const touchActive = useSharedValue(0);
  const frameSize = useRef({ width: 0, height: 0 });

  useEffect(() => {
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: depth === 'hero' ? 4200 : 3600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: depth === 'hero' ? 4200 : 3600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    float.value = withRepeat(
      withSequence(
        withTiming(1, { duration: depth === 'hero' ? 3400 : 2800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: depth === 'hero' ? 3400 : 2800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    sweep.value = withRepeat(withTiming(1, { duration: depth === 'hero' ? 5200 : 4600, easing: Easing.linear }), -1, false);
  }, [depth, float, sway, sweep]);

  const updateTouchTilt = useCallback((event: GestureResponderEvent) => {
    const { width, height } = frameSize.current;
    if (!width || !height) return;

    const nx = clamp(event.nativeEvent.locationX / width, 0, 1) * 2 - 1;
    const ny = clamp(event.nativeEvent.locationY / height, 0, 1) * 2 - 1;

    touchActive.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.cubic) });
    touchX.value = withTiming(nx, { duration: 120, easing: Easing.out(Easing.cubic) });
    touchY.value = withTiming(ny, { duration: 120, easing: Easing.out(Easing.cubic) });
  }, [touchActive, touchX, touchY]);

  const resetTouchTilt = useCallback(() => {
    touchActive.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
    touchX.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
    touchY.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [touchActive, touchX, touchY]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    frameSize.current = {
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    };
  }, []);

  const motionStyle = useAnimatedStyle(() => {
    const sensorPitch = sensorEnabled && sensorValue
      ? Math.max(-0.45, Math.min(0.45, sensorValue.value.pitch || 0))
      : 0;
    const sensorRoll = sensorEnabled && sensorValue
      ? Math.max(-0.55, Math.min(0.55, sensorValue.value.roll || 0))
      : 0;
    const rotateX = interpolate(float.value, [0, 1], [depth === 'hero' ? 8 : 5, depth === 'hero' ? 2 : 0]);
    const rotateY = interpolate(sway.value, [0, 1], [depth === 'hero' ? -10 : -6, depth === 'hero' ? 10 : 6]);
    const lift =
      interpolate(float.value, [0, 1], [0, depth === 'hero' ? -10 : -6]) -
      touchActive.value * (depth === 'hero' ? 10 : 6) -
      sensorPitch * (depth === 'hero' ? 8 : 5);
    const touchRotateX = -touchY.value * (depth === 'hero' ? 11 : 7) * touchActive.value;
    const touchRotateY = touchX.value * (depth === 'hero' ? 13 : 9) * touchActive.value;
    return {
      transform: [
        { perspective: 1400 },
        { translateX: touchX.value * (depth === 'hero' ? 6 : 4) * touchActive.value + sensorRoll * (depth === 'hero' ? 14 : 8) },
        { translateY: lift + touchY.value * 3 * touchActive.value },
        { scale: 1 + touchActive.value * (depth === 'hero' ? 0.018 : 0.012) + Math.abs(sensorRoll) * 0.02 },
        { rotateX: `${rotateX + touchRotateX - sensorPitch * (depth === 'hero' ? 18 : 12)}deg` },
        { rotateY: `${rotateY + touchRotateY + sensorRoll * (depth === 'hero' ? 22 : 15)}deg` },
      ],
    };
  });

  const backPlateStyle = useAnimatedStyle(() => {
    const sensorPitch = sensorEnabled && sensorValue
      ? Math.max(-0.45, Math.min(0.45, sensorValue.value.pitch || 0))
      : 0;
    const sensorRoll = sensorEnabled && sensorValue
      ? Math.max(-0.55, Math.min(0.55, sensorValue.value.roll || 0))
      : 0;
    const offsetY = interpolate(float.value, [0, 1], [12, 18]) + touchY.value * 5 * touchActive.value;
    return {
      opacity: interpolate(float.value, [0, 1], [0.4, 0.78]),
      transform: [
        { translateX: touchX.value * 8 * touchActive.value + sensorRoll * 10 },
        { translateY: offsetY + sensorPitch * 8 },
        { scaleX: 1 + touchActive.value * 0.02 },
      ],
    };
  });

  const midPlateStyle = useAnimatedStyle(() => {
    const sensorPitch = sensorEnabled && sensorValue
      ? Math.max(-0.45, Math.min(0.45, sensorValue.value.pitch || 0))
      : 0;
    const sensorRoll = sensorEnabled && sensorValue
      ? Math.max(-0.55, Math.min(0.55, sensorValue.value.roll || 0))
      : 0;
    const offsetY = interpolate(float.value, [0, 1], [6, 10]) + touchY.value * 3 * touchActive.value;
    return {
      opacity: interpolate(sway.value, [0, 1], [0.18, 0.4]),
      transform: [
        { translateX: touchX.value * 4 * touchActive.value + sensorRoll * 5 },
        { translateY: offsetY + sensorPitch * 5 },
      ],
    };
  });

  const sweepStyle = useAnimatedStyle(() => {
    const sensorRoll = sensorEnabled && sensorValue
      ? Math.max(-0.55, Math.min(0.55, sensorValue.value.roll || 0))
      : 0;
    return {
      opacity: 0.38 + touchActive.value * 0.12,
      transform: [
        { translateX: interpolate(sweep.value, [0, 1], [-320, 320]) + touchX.value * 30 * touchActive.value + sensorRoll * 34 },
        { rotate: '-12deg' },
      ],
    };
  });

  const innerGlowStyle = useAnimatedStyle(() => {
    const sensorPitch = sensorEnabled && sensorValue
      ? Math.max(-0.45, Math.min(0.45, sensorValue.value.pitch || 0))
      : 0;
    return {
      opacity: 0.16 + float.value * 0.18 + touchActive.value * 0.16 + Math.abs(sensorPitch) * 0.18,
      transform: [
        { translateY: -10 - float.value * 8 - sensorPitch * 10 },
        { scale: 1 + float.value * 0.05 + touchActive.value * 0.05 },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.depthFrame, style, motionStyle]}
      onLayout={handleLayout}
      onTouchStart={updateTouchTilt}
      onTouchMove={updateTouchTilt}
      onTouchEnd={resetTouchTilt}
      onTouchCancel={resetTouchTilt}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.depthBackPlate,
          { borderRadius: radius + 10, borderColor: `${accent}20` },
          backPlateStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.depthMidPlate,
          { borderRadius: radius + 6, borderColor: `${accent}33` },
          midPlateStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.depthInnerGlow,
          { borderRadius: radius + 2, backgroundColor: `${accent}10`, shadowColor: accent },
          innerGlowStyle,
        ]}
      />
      {children}
      <Animated.View pointerEvents="none" style={[styles.depthSweep, { borderRadius: radius }, sweepStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.14)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View
        pointerEvents="none"
        style={[styles.depthRim, { borderRadius: radius, borderColor: `${accent}14` }]}
      />
      {[
        styles.depthCornerTL,
        styles.depthCornerTR,
        styles.depthCornerBL,
        styles.depthCornerBR,
      ].map((cornerStyle, index) => (
        <View
          key={index}
          pointerEvents="none"
          style={[styles.depthCorner, cornerStyle, { borderColor: `${accent}38` }]}
        />
      ))}
    </Animated.View>
  );
}

// ─── 双频谱组件 ──────────────────────────────────────────────────────────────
const BARS = 28;
const BAR_MAX_H = 44; // 单侧最大高度 px

function DualSpectrum({ sensorEnabled = false, sensorValue }: DeviceTiltProps) {
  const { voiceBars, envBars } = useAudioAnalyser(BARS);
  const panelDepth = useSharedValue(0);
  const canopy = useSharedValue(0);
  const sweep = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    panelDepth.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    canopy.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    sweep.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [canopy, panelDepth, pulse, sweep]);

  const shellStyle = useAnimatedStyle(() => {
    const sensorPitch = sensorEnabled && sensorValue
      ? Math.max(-0.45, Math.min(0.45, sensorValue.value.pitch || 0))
      : 0;
    const sensorRoll = sensorEnabled && sensorValue
      ? Math.max(-0.55, Math.min(0.55, sensorValue.value.roll || 0))
      : 0;
    return {
      transform: [
        { perspective: 1200 },
        { translateX: sensorRoll * 10 },
        { translateY: interpolate(panelDepth.value, [0, 1], [0, -4]) - sensorPitch * 6 },
        { rotateX: `${interpolate(panelDepth.value, [0, 1], [6, 1]) - sensorPitch * 15}deg` },
        { rotateY: `${interpolate(panelDepth.value, [0, 1], [-4, 4]) + sensorRoll * 16}deg` },
      ],
    };
  });

  const canopyStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + canopy.value * 0.34,
    transform: [
      { scaleX: 0.92 + canopy.value * 0.18 },
      { translateY: -8 - canopy.value * 10 },
    ],
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + pulse.value * 0.18,
    transform: [
      { translateX: interpolate(sweep.value, [0, 1], [-220, 220]) },
      { rotate: '-10deg' },
    ],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + pulse.value * 0.24,
    transform: [{ scale: 0.96 + pulse.value * 0.08 }],
  }));

  return (
    <Animated.View style={[specStyles.shell, shellStyle]}>
      <Animated.View style={[specStyles.canopy, canopyStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(107,231,255,0.18)', 'transparent']}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View style={[specStyles.sideRail, specStyles.sideRailLeft]} />
      <View style={[specStyles.sideRail, specStyles.sideRailRight]} />
      <Animated.View style={[specStyles.wrap, pulseStyle]}>
        <View style={specStyles.wrapFrame} />
        <View style={specStyles.labelRow}>
          <Text style={[specStyles.label, { color: COLORS.warning }]}>环境音</Text>
          <Text style={[specStyles.label, { color: COLORS.success }]}>人声</Text>
        </View>

        <View style={specStyles.specWrap}>
          <View style={specStyles.specGrid} pointerEvents="none" />
          <Animated.View style={[specStyles.scanSweep, sweepStyle]} pointerEvents="none">
            <LinearGradient
              colors={['transparent', 'rgba(107,231,255,0.22)', 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <View style={specStyles.reticle} pointerEvents="none">
            <View style={specStyles.reticleHorizontal} />
            <View style={specStyles.reticleVertical} />
          </View>
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

          <View style={specStyles.centerLine}>
            <View style={specStyles.line} />
            <View style={specStyles.freqLabels}>
              {['100', '500', '1k', '2k', '4k', '8k'].map((f) => (
                <Text key={f} style={specStyles.freqTxt}>{f}</Text>
              ))}
            </View>
          </View>

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
      </Animated.View>
    </Animated.View>
  );
}

const specStyles = StyleSheet.create({
  shell: {
    position: 'relative',
    marginBottom: 14,
  },
  canopy: {
    position: 'absolute',
    left: 42,
    right: 42,
    top: -20,
    height: 66,
    borderRadius: 33,
    overflow: 'hidden',
  },
  sideRail: {
    position: 'absolute',
    top: 18,
    bottom: 22,
    width: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(107,231,255,0.2)',
  },
  sideRailLeft: { left: 12 },
  sideRailRight: { right: 12 },
  wrap: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: 16,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  wrapFrame: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(107,231,255,0.08)',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  specWrap: {
    gap: 0,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: 'rgba(1,8,18,0.42)',
  },
  specGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(107,231,255,0.08)',
  },
  scanSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 96,
  },
  reticle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 92,
    height: 92,
    marginLeft: -46,
    marginTop: -46,
    borderRadius: 46,
    borderWidth: 1,
    borderColor: 'rgba(107,231,255,0.12)',
  },
  reticleHorizontal: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 45,
    height: 1,
    backgroundColor: 'rgba(107,231,255,0.12)',
  },
  reticleVertical: {
    position: 'absolute',
    top: 16,
    bottom: 16,
    left: 45,
    width: 1,
    backgroundColor: 'rgba(107,231,255,0.12)',
  },

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

function SciFiPowerButton({
  status,
  onPress,
  sensorEnabled = false,
  sensorValue,
}: DeviceTiltProps & { status: BtnStatus; onPress: () => void }) {
  const isRunning = status === 'running';
  const isStarting = status === 'starting' || status === 'stopping';
  const buttonSize = useRef({ width: 0, height: 0 });

  // ── 始终运行的动画值 ────────────────────────────────────────────────────────
  const rotA = useSharedValue(0);      // 顺时针外环
  const rotB = useSharedValue(0);      // 逆时针中环
  const breathe = useSharedValue(0);   // 光晕呼吸 0~1
  const holoPulse = useSharedValue(0);
  const holoSweep = useSharedValue(0);
  const touchX = useSharedValue(0);
  const touchY = useSharedValue(0);
  const touchActive = useSharedValue(0);

  // ── 激活时的动画值 ─────────────────────────────────────────────────────────
  const expandA = useSharedValue(0);   // 扩散环A
  const expandB = useSharedValue(0);   // 扩散环B（错相）
  const innerScale = useSharedValue(1);
  const scanLine = useSharedValue(0);  // 扫描线 0→1

  // ── 计时器 ref（用于错相扩散） ────────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }

    holoPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: isRunning ? 1400 : 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: isRunning ? 1400 : 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    holoSweep.value = withRepeat(
      withTiming(1, { duration: isRunning ? 1800 : isStarting ? 2200 : 3000, easing: Easing.linear }),
      -1,
      false
    );

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
  }, [breathe, expandA, expandB, holoPulse, holoSweep, innerScale, isRunning, isStarting, rotA, rotB, scanLine]);

  const updateTouchDepth = useCallback((event: GestureResponderEvent) => {
    const { width, height } = buttonSize.current;
    if (!width || !height) return;

    const nx = clamp(event.nativeEvent.locationX / width, 0, 1) * 2 - 1;
    const ny = clamp(event.nativeEvent.locationY / height, 0, 1) * 2 - 1;

    touchActive.value = withTiming(1, { duration: 130, easing: Easing.out(Easing.cubic) });
    touchX.value = withTiming(nx, { duration: 110, easing: Easing.out(Easing.cubic) });
    touchY.value = withTiming(ny, { duration: 110, easing: Easing.out(Easing.cubic) });
  }, [touchActive, touchX, touchY]);

  const resetTouchDepth = useCallback(() => {
    touchActive.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
    touchX.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
    touchY.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [touchActive, touchX, touchY]);

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
  const stageStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1700 },
      { translateY: interpolate(breathe.value, [0, 1], [0, -8]) - touchActive.value * 12 },
      { scale: 1 + touchActive.value * 0.02 },
      { rotateX: `${interpolate(breathe.value, [0, 1], [14, 7]) - touchY.value * 12 * touchActive.value}deg` },
      { rotateY: `${interpolate(breathe.value, [0, 1], [-7, 7]) + touchX.value * 14 * touchActive.value}deg` },
    ],
  }));
  const platformGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breathe.value, [0, 1], [0.28, 0.82]) + touchActive.value * 0.08,
    transform: [
      { scaleX: interpolate(breathe.value, [0, 1], [0.9, 1.08]) + touchActive.value * 0.05 },
      { scaleY: interpolate(breathe.value, [0, 1], [0.82, 1.02]) + touchActive.value * 0.03 },
    ],
  }));
  const platformOrbitStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotA.value * 0.35}deg` },
      { translateX: touchX.value * 4 * touchActive.value },
    ],
  }));
  const projectionDiscStyle = useAnimatedStyle(() => ({
    opacity: interpolate(holoPulse.value, [0, 1], [0.16, isRunning ? 0.6 : 0.34]) + touchActive.value * 0.12,
    transform: [
      { scaleX: interpolate(holoPulse.value, [0, 1], [0.88, 1.18]) + touchActive.value * 0.08 },
      { scaleY: interpolate(holoPulse.value, [0, 1], [0.68, 0.96]) + touchActive.value * 0.05 },
    ],
  }));
  const projectionGridStyle = useAnimatedStyle(() => ({
    opacity: interpolate(holoPulse.value, [0, 1], [0.18, isRunning ? 0.72 : 0.4]),
    transform: [
      { rotate: `${rotB.value * -0.22}deg` },
      { scaleX: 1 + touchActive.value * 0.05 },
      { scaleY: 1 + touchActive.value * 0.03 },
    ],
  }));
  const projectionSweepStyle = useAnimatedStyle(() => ({
    opacity: isRunning ? 0.42 : 0.22,
    transform: [
      { translateX: interpolate(holoSweep.value, [0, 1], [-130, 130]) },
      { rotate: '-10deg' },
    ],
  }));
  const projectionBeamStyle = useAnimatedStyle(() => ({
    opacity: interpolate(holoPulse.value, [0, 1], [0.08, isRunning ? 0.3 : 0.18]) + touchActive.value * 0.1,
    transform: [
      { translateY: interpolate(holoSweep.value, [0, 1], [10, -20]) - touchActive.value * 8 },
      { scaleY: 1 + touchActive.value * 0.15 },
    ],
  }));
  const pedestalStyle = useAnimatedStyle(() => ({
    opacity: 0.82 + touchActive.value * 0.14,
    transform: [
      { translateY: interpolate(breathe.value, [0, 1], [0, 3]) + touchActive.value * 6 },
      { scaleX: 1 - touchActive.value * 0.05 },
    ],
  }));
  const liftShadowStyle = useAnimatedStyle(() => ({
    opacity: 0.24 + breathe.value * 0.22,
    transform: [
      { scaleX: 1.06 - touchActive.value * 0.12 },
      { scaleY: 0.92 - touchActive.value * 0.08 },
    ],
  }));
  const upperHaloStyle = useAnimatedStyle(() => ({
    opacity: 0.16 + breathe.value * 0.28 + touchActive.value * 0.08,
    transform: [
      { rotate: `${rotB.value * -0.3}deg` },
      { scale: 0.92 + holoPulse.value * 0.18 + touchActive.value * 0.06 },
      { translateY: -22 - touchActive.value * 10 },
    ],
  }));
  const sideBeamStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + holoPulse.value * 0.2 + touchActive.value * 0.08,
    transform: [{ scaleY: 0.9 + holoPulse.value * 0.12 }],
  }));
  const mainCircleWrapStyle = useAnimatedStyle(() => {
    const sensorPitch = sensorEnabled && sensorValue
      ? Math.max(-0.45, Math.min(0.45, sensorValue.value.pitch || 0))
      : 0;
    const sensorRoll = sensorEnabled && sensorValue
      ? Math.max(-0.55, Math.min(0.55, sensorValue.value.roll || 0))
      : 0;
    return {
      transform: [
        { perspective: 1400 },
        { translateX: sensorRoll * 8 },
        { translateY: -touchActive.value * 14 - interpolate(innerScale.value, [1, 1.07], [0, 4]) - sensorPitch * 7 },
        { scale: 1 + touchActive.value * 0.025 + Math.abs(sensorRoll) * 0.025 },
        { rotateX: `${-touchY.value * 8 * touchActive.value - sensorPitch * 10}deg` },
        { rotateY: `${touchX.value * 10 * touchActive.value + sensorRoll * 12}deg` },
      ],
    };
  });
  const sensorStageStyle = useAnimatedStyle(() => {
    const sensorPitch = sensorEnabled && sensorValue
      ? Math.max(-0.45, Math.min(0.45, sensorValue.value.pitch || 0))
      : 0;
    const sensorRoll = sensorEnabled && sensorValue
      ? Math.max(-0.55, Math.min(0.55, sensorValue.value.roll || 0))
      : 0;
    return {
      transform: [
        { perspective: 1800 },
        { translateX: sensorRoll * 14 },
        { translateY: -sensorPitch * 10 },
        { rotateX: `${-sensorPitch * 15}deg` },
        { rotateY: `${sensorRoll * 18}deg` },
      ],
    };
  });

  const accent = isRunning ? COLORS.success : isStarting ? COLORS.warning : COLORS.primary;
  const innerBg: [string, string] = isRunning
    ? ['#001F12', '#003820']
    : isStarting
      ? ['#251A00', '#3C2900']
      : ['#03101F', '#071E38'];

  return (
    <Pressable
      onPress={onPress}
      style={styles.btnTouchable}
      onLayout={(event) => {
        buttonSize.current = {
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        };
      }}
      onTouchStart={updateTouchDepth}
      onTouchMove={updateTouchDepth}
      onTouchEnd={resetTouchDepth}
      onTouchCancel={resetTouchDepth}
    >
      <Animated.View style={[styles.btn3DStage, sensorStageStyle, stageStyle]}>
        <Animated.View style={[styles.liftShadow, { backgroundColor: `${accent}22` }, liftShadowStyle]} />
        <Animated.View style={[styles.upperHalo, { borderColor: `${accent}42` }, upperHaloStyle]} />
        <Animated.View style={[styles.sideBeam, styles.sideBeamLeft, sideBeamStyle]}>
          <LinearGradient
            colors={['transparent', `${accent}22`, 'transparent']}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View style={[styles.sideBeam, styles.sideBeamRight, sideBeamStyle]}>
          <LinearGradient
            colors={['transparent', `${accent}22`, 'transparent']}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View style={[styles.projectionBeam, projectionBeamStyle]}>
          <LinearGradient
            colors={['transparent', `${accent}16`, `${accent}33`, `${accent}08`, 'transparent']}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View style={[styles.projectionDisc, { backgroundColor: `${accent}14` }, projectionDiscStyle]}>
          <Animated.View style={[styles.projectionGrid, { borderColor: `${accent}55` }, projectionGridStyle]} />
          <Animated.View style={[styles.projectionGridInner, { borderColor: `${accent}22` }, projectionGridStyle]} />
          <Animated.View style={[styles.projectionSweep, projectionSweepStyle]}>
            <LinearGradient
              colors={['transparent', `${accent}44`, 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Animated.View>
        <Animated.View style={[styles.platformPedestal, { borderColor: `${accent}26` }, pedestalStyle]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <View style={[styles.platformPedestalEdge, { borderColor: `${accent}1A` }]} />
        <Animated.View style={[styles.platformGlow, { backgroundColor: `${accent}22` }, platformGlowStyle]} />
        <View style={[styles.platformShadow, { backgroundColor: `${accent}18` }]} />
        <Animated.View style={[styles.platformOrbit, { borderColor: `${accent}55` }, platformOrbitStyle]} />
        <View style={[styles.platformOrbitInner, { borderColor: `${accent}33` }]} />

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
        <Animated.View style={[styles.mainCircleWrap, mainCircleWrapStyle]}>
          <LinearGradient
            colors={innerBg}
            style={[styles.mainCircle, { shadowColor: accent, shadowOpacity: isRunning ? 1 : 0.45 }]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
          >
            <View style={[styles.mainCircleRim, { borderColor: `${accent}40` }]} />

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
        </Animated.View>
      </Animated.View>

      {/* ── 底部标签 */}
      <Text style={[styles.btnLabel, { color: accent }]}>
        {status === 'running' ? '点击停止' : '点击开始助听'}
      </Text>
    </Pressable>
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
  params: AudioParams;
  updateFeedbackCorrection: (p: Partial<FeedbackCorrection>) => void;
  persistFeedbackCorrection: (fc: FeedbackCorrection) => Promise<void>;
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
  const deviceRotation = useAnimatedSensor(SensorType.ROTATION, {
    interval: 'auto',
    adjustToInterfaceOrientation: true,
  });

  const {
    status, params, configLocked, feedbackFrequency, error,
    setStatus, setError, updateParams, setHeadphoneConnected, updateFeedbackCorrection,
  } = useAudioStore(
    useShallow((s) => ({
      status: s.status,
      params: s.params,
      configLocked: s.configLocked,
      feedbackFrequency: s.feedbackFrequency,
      error: s.error,
      setStatus: s.setStatus,
      setError: s.setError,
      updateParams: s.updateParams,
      setHeadphoneConnected: s.setHeadphoneConnected,
      updateFeedbackCorrection: s.updateFeedbackCorrection,
    }))
  );

  const { showPaywall, isPaid, isInTrial, trialDaysRemaining } = useSubscriptionStore(
    useShallow((s) => ({
      showPaywall: s.showPaywall,
      isPaid: s.isPaid,
      isInTrial: s.isInTrial,
      trialDaysRemaining: s.trialDaysRemaining,
    }))
  );
  const { isOfflineMode } = useConfigStore(useShallow((s) => ({ isOfflineMode: s.isOfflineMode })));
  const { requestPermission } = useAudioPermission();
  const { isConnected: headphoneConnected } = useHeadphoneDetection();

  const prevConnected = useRef(headphoneConnected);
  const hasAutoStarted = useRef(false);
  const sensorEnabled = deviceRotation.isAvailable;
  const sensorValue = deviceRotation.sensor;

  // ── 初始化后台服务
  useEffect(() => {
    initBackgroundService().catch((e) => reportError('home.initBackgroundService', e));
  }, []);

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
  }, [headphoneConnected, params.headphoneMode, setHeadphoneConnected, status, updateParams]);

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
          try {
            await startBackgroundAudio();
          } catch (e) {
            reportError('home.autoStartBackgroundAudio', e);
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : '启动失败，请重试';
        setStatus('error');
        setError({ code: 'ENGINE_ERROR', message: msg });
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
  const outputLabel = params.headphoneMode === HeadphoneMode.BONE_CONDUCTION ? 'BONE' : 'HEADSET';
  const engineLabel = isRunning ? 'LIVE' : isStarting ? 'BOOT' : 'IDLE';
  const aiLabel = params.neuralDenoiser ? 'ON' : 'OFF';

  // ── 开始/停止
  const handleToggle = useCallback(async () => {
    try {
      if (showPaywall) { router.push('/paywall'); return; }

      if (isRunning || isStarting) {
        setStatus('stopping');
        await AudioEngine.stop();
        try {
          await stopBackgroundAudio();
        } catch (e) {
          reportError('home.stopBackgroundAudio', e);
        }
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
        try {
          await startBackgroundAudio();
        } catch (e) {
          reportError('home.startBackgroundAudio', e);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '操作失败，请重试';
      setStatus('error');
      setError({ code: 'ENGINE_ERROR', message: msg });
    }
  }, [headphoneConnected, isRunning, isStarting, requestPermission, router, setError, setStatus, showPaywall]);

  return (
    <View style={styles.root}>
      <ScreenBackdrop />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── 顶部栏 */}
          <View style={styles.topBar}>
            <DepthFrame
              accent={COLORS.primary}
              depth="hero"
              radius={26}
              sensorEnabled={sensorEnabled}
              sensorValue={sensorValue}
            >
              <LinearGradient
                colors={['rgba(107,231,255,0.13)', 'rgba(46,240,181,0.06)', 'rgba(11,21,39,0.95)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroMesh} pointerEvents="none">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.heroMeshLine,
                        { left: `${12 + index * 14}%` as `${number}%` },
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.heroRingLarge} pointerEvents="none" />
                <View style={styles.heroRingSmall} pointerEvents="none" />
                <View style={styles.heroGlow} />
                <View style={styles.topBarRow}>
                  <View style={styles.topBarLeft}>
                    <Text style={styles.appName}>HEAR CLEAR</Text>
                    <Text style={styles.appSub}>REAL-TIME CLARITY CONSOLE</Text>
                  </View>
                  <View style={styles.topBadges}>
                    {isOfflineMode && <View style={[styles.badge, { borderColor: COLORS.warning }]}><Text style={[styles.badgeText, { color: COLORS.warning }]}>OFFLINE</Text></View>}
                    {isPaid && <View style={[styles.badge, { borderColor: COLORS.success }]}><Text style={[styles.badgeText, { color: COLORS.success }]}>PRO</Text></View>}
                  </View>
                </View>
                <Text style={styles.heroTitle}>Clarity Core</Text>
                <Text style={styles.heroSubtitle}>
                  {headphoneConnected
                    ? '耳机链路已接入，可直接进行实时增强与降噪。'
                    : '当前处于监听模式，接入耳机后会自动切换到可听增强输出。'}
                </Text>
                <View style={styles.heroStatsRow}>
                  <View style={styles.heroStatCard}>
                    <Text style={styles.heroStatLabel}>ENGINE</Text>
                    <Text style={styles.heroStatValue}>{engineLabel}</Text>
                  </View>
                  <View style={styles.heroStatCard}>
                    <Text style={styles.heroStatLabel}>OUTPUT</Text>
                    <Text style={styles.heroStatValue}>{outputLabel}</Text>
                  </View>
                  <View style={styles.heroStatCard}>
                    <Text style={styles.heroStatLabel}>AI DENOISE</Text>
                    <Text style={styles.heroStatValue}>{aiLabel}</Text>
                  </View>
                </View>
              </LinearGradient>
            </DepthFrame>
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
          <DepthFrame
            accent={COLORS.success}
            radius={22}
            sensorEnabled={sensorEnabled}
            sensorValue={sensorValue}
            style={styles.surface3DWrap}
          >
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
          </DepthFrame>

          {/* ── 主按钮区 */}
          <View style={styles.btnZone}>
            <SciFiPowerButton
              status={status as BtnStatus}
              onPress={handleToggle}
              sensorEnabled={sensorEnabled}
              sensorValue={sensorValue}
            />
          </View>

          {/* ── 双频谱（人声 / 环境音）*/}
          <DualSpectrum sensorEnabled={sensorEnabled} sensorValue={sensorValue} />
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
          <DepthFrame
            accent={COLORS.primary}
            radius={22}
            sensorEnabled={sensorEnabled}
            sensorValue={sensorValue}
            style={styles.surface3DWrap}
          >
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
          </DepthFrame>

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
    </View>
  );
}

// ─── 样式 ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },
  depthFrame: {
    position: 'relative',
  },
  depthBackPlate: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 10,
    bottom: -12,
    backgroundColor: 'rgba(3,8,18,0.82)',
    borderWidth: 1,
  },
  depthMidPlate: {
    position: 'absolute',
    left: 5,
    right: 5,
    top: 5,
    bottom: -6,
    backgroundColor: 'rgba(10,20,38,0.22)',
    borderWidth: 1,
  },
  depthSweep: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  depthInnerGlow: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 8,
    height: 88,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
    shadowOpacity: 0.38,
  },
  depthRim: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
  depthCorner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderWidth: 1.5,
  },
  depthCornerTL: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  depthCornerTR: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  depthCornerBL: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  depthCornerBR: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },

  // 顶栏
  topBar: { marginBottom: 20 },
  surface3DWrap: { marginBottom: 20 },
  heroCard: {
    position: 'relative',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  heroGlow: {
    position: 'absolute',
    top: -44,
    right: -24,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(107,231,255,0.1)',
  },
  heroMesh: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.22,
  },
  heroMeshLine: {
    position: 'absolute',
    top: 18,
    bottom: 18,
    width: 1,
    backgroundColor: 'rgba(107,231,255,0.12)',
  },
  heroRingLarge: {
    position: 'absolute',
    right: -8,
    top: 26,
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 1,
    borderColor: 'rgba(107,231,255,0.16)',
  },
  heroRingSmall: {
    position: 'absolute',
    right: 28,
    top: 56,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(107,231,255,0.16)',
  },
  topBarRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  topBarLeft: {},
  appName: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 4.8,
    textShadowColor: COLORS.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  appSub: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2.2, marginTop: 4 },
  heroTitle: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.black,
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  heroSubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
    maxWidth: 320,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  heroStatCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(5,9,20,0.42)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
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
  topBadges: { flexDirection: 'row', gap: 8, marginTop: 4 },
  badge: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
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
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: 16,
    marginBottom: 20,
    overflow: 'hidden',
    ...SHADOW.sm,
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
    backgroundColor: 'rgba(255,190,92,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,190,92,0.3)',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
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
  btn3DStage: {
    width: RING3 + 16,
    height: RING3 + 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liftShadow: {
    position: 'absolute',
    bottom: 16,
    width: 188,
    height: 34,
    borderRadius: 94,
  },
  upperHalo: {
    position: 'absolute',
    top: 26,
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
  },
  sideBeam: {
    position: 'absolute',
    top: 56,
    width: 18,
    height: 156,
    overflow: 'hidden',
    borderRadius: 9,
  },
  sideBeamLeft: {
    left: 22,
  },
  sideBeamRight: {
    right: 22,
  },
  projectionBeam: {
    position: 'absolute',
    bottom: 34,
    width: 164,
    height: 112,
    overflow: 'hidden',
    borderRadius: 82,
  },
  projectionDisc: {
    position: 'absolute',
    bottom: 14,
    width: 244,
    height: 70,
    borderRadius: 122,
    overflow: 'hidden',
  },
  projectionGrid: {
    position: 'absolute',
    top: 10,
    left: 22,
    right: 22,
    bottom: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  projectionGridInner: {
    position: 'absolute',
    top: 18,
    left: 42,
    right: 42,
    bottom: 18,
    borderRadius: 80,
    borderWidth: 1,
  },
  projectionSweep: {
    ...StyleSheet.absoluteFillObject,
  },
  platformPedestal: {
    position: 'absolute',
    bottom: 18,
    width: 182,
    height: 36,
    borderRadius: 91,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(4,8,18,0.66)',
  },
  platformPedestalEdge: {
    position: 'absolute',
    bottom: 28,
    width: 166,
    height: 18,
    borderRadius: 83,
    borderWidth: 1,
  },
  platformGlow: {
    position: 'absolute',
    bottom: 18,
    width: 220,
    height: 52,
    borderRadius: 110,
  },
  platformShadow: {
    position: 'absolute',
    bottom: 10,
    width: 216,
    height: 44,
    borderRadius: 108,
  },
  platformOrbit: {
    position: 'absolute',
    bottom: 16,
    width: 208,
    height: 42,
    borderRadius: 104,
    borderWidth: 1.5,
  },
  platformOrbitInner: {
    position: 'absolute',
    bottom: 24,
    width: 154,
    height: 26,
    borderRadius: 77,
    borderWidth: 1,
  },

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
  mainCircleWrap: {
    position: 'absolute',
    top: (RING3 + 16 - BTN) / 2,
    left: (RING3 + 16 - BTN) / 2,
  },

  // 主圆
  mainCircle: {
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
  mainCircleRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BTN / 2,
    borderWidth: 1,
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
    backgroundColor: 'rgba(255,122,135,0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,122,135,0.35)',
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
    backgroundColor: 'rgba(255,122,135,0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,122,135,0.35)',
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
    backgroundColor: 'rgba(107,231,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(107,231,255,0.25)',
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  trialTxt: { color: COLORS.primary, fontSize: 12 },

  // 参数卡
  paramsCard: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: 18,
    marginBottom: 12,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  paramsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  paramsTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2 },
  lockedTxt: { fontSize: 11, color: COLORS.warning },


  // Expo Go 提示卡
  expoGoCard: {
    backgroundColor: 'rgba(255,190,92,0.08)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,190,92,0.25)',
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

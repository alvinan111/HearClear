import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  SensorType,
  interpolate,
  useAnimatedSensor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSettingsStore } from '@stores/settings-store';
import { setItem } from '@utils/storage';
import { STORAGE_KEYS } from '@constants/trial';
import { BORDER_RADIUS, COLORS, FONT_SIZE, FONT_WEIGHT, SHADOW, SPACING } from '@constants/theme';
import { ScreenBackdrop } from '@components/ui/ScreenBackdrop';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type RotationSensorValue = { value: { pitch?: number; roll?: number } };

interface Slide {
  key: string;
  icon: string;
  accent: string;
  glow: string;
  coreColors: [string, string];
  titleKey: string;
  descKey: string;
  eyebrow: string;
  status: string;
  tags: [string, string, string];
}

const SLIDES: Slide[] = [
  {
    key: 'hearing',
    icon: '👂',
    accent: COLORS.primary,
    glow: 'rgba(107,231,255,0.24)',
    coreColors: ['rgba(107,231,255,0.22)', 'rgba(5,14,28,0.98)'],
    titleKey: 'onboarding.slides.hearing.title',
    descKey: 'onboarding.slides.hearing.description',
    eyebrow: 'SIGNAL MAP',
    status: 'SCAN READY',
    tags: ['Voice Focus', 'Scene Lift', 'Low Delay'],
  },
  {
    key: 'voice',
    icon: '🗣️',
    accent: COLORS.success,
    glow: 'rgba(46,240,181,0.24)',
    coreColors: ['rgba(46,240,181,0.22)', 'rgba(5,18,20,0.98)'],
    titleKey: 'onboarding.slides.voice.title',
    descKey: 'onboarding.slides.voice.description',
    eyebrow: 'VOICE CORE',
    status: 'TRACK LIVE',
    tags: ['Speech Lock', 'Noise Gate', 'Adaptive Mix'],
  },
  {
    key: 'boneConducting',
    icon: '🎧',
    accent: COLORS.warning,
    glow: 'rgba(255,190,92,0.24)',
    coreColors: ['rgba(255,190,92,0.22)', 'rgba(24,15,5,0.98)'],
    titleKey: 'onboarding.slides.boneConducting.title',
    descKey: 'onboarding.slides.boneConducting.description',
    eyebrow: 'OUTPUT LINK',
    status: 'ROUTE READY',
    tags: ['Bone Mode', 'Dual Output', 'Quick Calibrate'],
  },
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setOnboardingDone = useSettingsStore((s) => s.setOnboardingDone);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);
  const deviceRotation = useAnimatedSensor(SensorType.ROTATION, {
    interval: 'auto',
    adjustToInterfaceOrientation: true,
  });
  const dockPulse = useSharedValue(0);

  useEffect(() => {
    dockPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [dockPulse]);

  async function finish() {
    await setItem(STORAGE_KEYS.ONBOARDING_DONE, true);
    setOnboardingDone(true);
    router.replace('/(tabs)');
  }

  function goNext() {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      finish();
    }
  }

  function jumpTo(index: number) {
    flatListRef.current?.scrollToIndex({ index, animated: true });
  }

  function goToHearingTest() {
    setItem(STORAGE_KEYS.ONBOARDING_DONE, true).then(() => {
      useSettingsStore.getState().setOnboardingDone(true);
      router.replace('/hearing-test' as Href);
    });
  }

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index ?? 0);
      }
    }
  ).current;

  const sensorEnabled = deviceRotation.isAvailable;
  const sensorValue = deviceRotation.sensor;
  const dockStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(dockPulse.value, [0, 1], [0, -4]) }],
  }));

  return (
    <View style={styles.root}>
      <ScreenBackdrop />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.topEyebrow}>SYSTEM BOOT</Text>
            <Text style={styles.topCounter}>
              0{currentIndex + 1} / 0{SLIDES.length}
            </Text>
          </View>
          {currentIndex < SLIDES.length - 1 && (
            <TouchableOpacity style={styles.skipButton} onPress={finish} activeOpacity={0.8}>
              <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          ref={flatListRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          renderItem={({ item, index }) => (
            <SlideItem
              slide={item}
              index={index}
              active={currentIndex === index}
              title={t(item.titleKey)}
              description={t(item.descKey)}
              sensorEnabled={sensorEnabled}
              sensorValue={sensorValue}
            />
          )}
        />

        <Animated.View style={[styles.footerDock, dockStyle]}>
          <View style={styles.footerTopRow}>
            <Text style={styles.footerLabel}>BOOT SEQUENCE</Text>
            <Text style={styles.footerStatus}>{SLIDES[currentIndex].status}</Text>
          </View>

          <View style={styles.dots}>
            {SLIDES.map((slide, index) => {
              const active = index === currentIndex;
              return (
                <TouchableOpacity
                  key={slide.key}
                  onPress={() => jumpTo(index)}
                  activeOpacity={0.85}
                  style={[
                    styles.dot,
                    active && [styles.dotActive, { backgroundColor: slide.accent, shadowColor: slide.accent }],
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.footerActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={goToHearingTest} activeOpacity={0.85}>
              <Text style={styles.secondaryButtonText}>{t('hearingTest.startTest')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryButton} onPress={goNext} activeOpacity={0.88}>
              <LinearGradient
                colors={[SLIDES[currentIndex].accent, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryGradient}
              >
                <Text style={styles.primaryButtonText}>
                  {currentIndex === SLIDES.length - 1 ? t('onboarding.getStarted') : t('onboarding.next')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function SlideItem({
  slide,
  index,
  active,
  title,
  description,
  sensorEnabled,
  sensorValue,
}: {
  slide: Slide;
  index: number;
  active: boolean;
  title: string;
  description: string;
  sensorEnabled: boolean;
  sensorValue: RotationSensorValue;
}) {
  const orbitA = useSharedValue(0);
  const orbitB = useSharedValue(0);
  const float = useSharedValue(0);
  const sweep = useSharedValue(0);
  const activePhase = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    orbitA.value = withRepeat(withTiming(360, { duration: 12000, easing: Easing.linear }), -1, false);
    orbitB.value = withRepeat(withTiming(-360, { duration: 17000, easing: Easing.linear }), -1, false);
    float.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    sweep.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.linear }), -1, false);
  }, [float, orbitA, orbitB, sweep]);

  useEffect(() => {
    activePhase.value = withTiming(active ? 1 : 0.45, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    });
  }, [active, activePhase]);

  const stageStyle = useAnimatedStyle(() => {
    const pitch = sensorEnabled ? clamp(sensorValue.value.pitch || 0, -0.45, 0.45) : 0;
    const roll = sensorEnabled ? clamp(sensorValue.value.roll || 0, -0.55, 0.55) : 0;
    return {
      opacity: 0.72 + activePhase.value * 0.28,
      transform: [
        { perspective: 1500 },
        { translateX: roll * 12 },
        { translateY: interpolate(float.value, [0, 1], [10, -10]) - activePhase.value * 10 - pitch * 12 },
        { scale: 0.95 + activePhase.value * 0.08 },
        { rotateX: `${-pitch * 16 + interpolate(float.value, [0, 1], [8, 2])}deg` },
        { rotateY: `${roll * 18 + interpolate(float.value, [0, 1], [-5, 5])}deg` },
      ],
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.28 + float.value * 0.32 + activePhase.value * 0.18,
    transform: [{ scale: 0.9 + float.value * 0.18 }],
  }));

  const orbitAStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitA.value}deg` }],
  }));

  const orbitBStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitB.value}deg` }],
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + activePhase.value * 0.14,
    transform: [
      { translateX: interpolate(sweep.value, [0, 1], [-140, 140]) },
      { rotate: '-14deg' },
    ],
  }));

  return (
    <View style={styles.slide}>
      <View style={styles.slideTopRow}>
        <View style={styles.slideIndexPill}>
          <Text style={styles.slideIndexText}>0{index + 1}</Text>
        </View>
        <View style={[styles.slideStatusPill, { borderColor: `${slide.accent}44` }]}>
          <Text style={[styles.slideStatusText, { color: slide.accent }]}>{slide.status}</Text>
        </View>
      </View>

      <Animated.View style={[styles.reactorStage, stageStyle]}>
        <Animated.View style={[styles.reactorGlow, { backgroundColor: slide.glow }, glowStyle]} />
        <Animated.View style={[styles.orbitRing, { borderColor: `${slide.accent}36` }, orbitAStyle]} />
        <Animated.View style={[styles.orbitRingInner, { borderColor: `${slide.accent}22` }, orbitBStyle]} />
        <Animated.View style={[styles.reactorSweep, sweepStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.16)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <LinearGradient
          colors={slide.coreColors}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[styles.iconCore, { borderColor: `${slide.accent}30` }]}
        >
          <View style={[styles.iconCoreRim, { borderColor: `${slide.accent}34` }]} />
          <Text style={styles.icon}>{slide.icon}</Text>
          <Text style={[styles.iconLabel, { color: slide.accent }]}>{slide.eyebrow}</Text>
        </LinearGradient>
      </Animated.View>

      <View style={styles.copyCard}>
        <Text style={[styles.copyEyebrow, { color: slide.accent }]}>{slide.eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.tagsRow}>
          {slide.tags.map((tag) => (
            <View key={tag} style={[styles.tag, { borderColor: `${slide.accent}2C` }]}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safe: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  topEyebrow: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 2.8,
  },
  topCounter: {
    marginTop: 4,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  skipButton: {
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(8,17,33,0.58)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  slide: {
    width: SCREEN_W,
    minHeight: SCREEN_H - 180,
    paddingTop: 120,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 240,
    alignItems: 'center',
  },
  slideTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  slideIndexPill: {
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(8,17,33,0.64)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  slideIndexText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    letterSpacing: 1.8,
  },
  slideStatusPill: {
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    backgroundColor: 'rgba(8,17,33,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  slideStatusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 1.8,
  },
  reactorStage: {
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  reactorGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  orbitRing: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1.5,
  },
  orbitRingInner: {
    position: 'absolute',
    width: 202,
    height: 202,
    borderRadius: 101,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  reactorSweep: {
    position: 'absolute',
    width: 210,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  iconCore: {
    width: 188,
    height: 188,
    borderRadius: 94,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.md,
  },
  iconCoreRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 94,
    borderWidth: 1,
  },
  icon: {
    fontSize: 82,
    marginBottom: SPACING.sm,
  },
  iconLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 2.6,
  },
  copyCard: {
    width: '100%',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surfaceGlass,
    padding: SPACING.lg,
    ...SHADOW.md,
  },
  copyEyebrow: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 2.8,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.black,
    color: COLORS.text,
    marginBottom: SPACING.md,
    lineHeight: 46,
  },
  description: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
    lineHeight: 30,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  tag: {
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  footerDock: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    bottom: SPACING.lg,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: 'rgba(8,17,33,0.86)',
    padding: SPACING.lg,
    ...SHADOW.md,
  },
  footerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  footerLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 2.4,
  },
  footerStatus: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 1.6,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    width: 40,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  footerActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  secondaryButton: {
    flex: 1,
    height: 58,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  primaryButton: {
    flex: 1.25,
    height: 58,
    borderRadius: 20,
    overflow: 'hidden',
  },
  primaryGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.black,
    color: COLORS.background,
    letterSpacing: 1.2,
  },
});

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  SensorType,
  interpolate,
  type SharedValue,
  useAnimatedSensor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { BORDER_RADIUS, COLORS, FONT_SIZE, FONT_WEIGHT, SHADOW, SPACING } from '@constants/theme';
import { setItem } from '@utils/storage';
import { STORAGE_KEYS } from '@constants/trial';
import { useAudioStore } from '@stores/audio-store';
import { ScreenBackdrop } from '@components/ui/ScreenBackdrop';
import {
  disposeHearingTestContext,
  getHearingTestState,
  initHearingTestContext,
  isHearingTestAvailable,
  playTone,
  respond,
  startFrequency,
  stopTone,
} from '@services/hearing-test/HearingTestEngine';
import { audiogramToPrescription } from '@services/hearing-test/prescription';
import { AUDIOGRAM_FREQUENCIES } from '@/types/audiogram';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
type RotationSensorValue = { value: { pitch?: number; roll?: number } };

export default function HearingTestScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setAudiogramAndPrescription = useAudioStore((s) => s.setAudiogramAndPrescription);
  const [step, setStep] = useState<'intro' | 'testing' | 'done'>('intro');
  const [initializing, setInitializing] = useState(false);
  const [currentFreqIndex, setCurrentFreqIndex] = useState(0);
  const [state, setState] = useState(getHearingTestState());
  const stepPhase = useSharedValue(0);
  const deviceRotation = useAnimatedSensor(SensorType.ROTATION, {
    interval: 'auto',
    adjustToInterfaceOrientation: true,
  });

  const available = isHearingTestAvailable();
  const totalFreqs = AUDIOGRAM_FREQUENCIES.length;
  const sensorEnabled = deviceRotation.isAvailable;
  const sensorValue = deviceRotation.sensor;
  const completedCount = step === 'done' ? totalFreqs : currentFreqIndex;
  const activeFreq = step === 'testing'
    ? state.currentFreq ?? AUDIOGRAM_FREQUENCIES[currentFreqIndex]
    : null;

  useEffect(() => {
    const interval = setInterval(() => setState(getHearingTestState()), 200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      stopTone();
      disposeHearingTestContext();
    };
  }, []);

  useEffect(() => {
    stepPhase.value = 0;
    stepPhase.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [step, stepPhase]);

  async function handleStartTest() {
    if (!available) return;
    setInitializing(true);
    const ok = await initHearingTestContext();
    setInitializing(false);
    if (!ok) return;
    setStep('testing');
    setCurrentFreqIndex(0);
    startFrequency(0);
    playTone();
  }

  function handleSkip() {
    router.replace('/(tabs)');
  }

  function advanceAfterResponse() {
    const nextState = getHearingTestState();
    setState(nextState);
    if (nextState.currentFreqIndex < 0) {
      const next = currentFreqIndex + 1;
      if (next >= totalFreqs) {
        setStep('done');
      } else {
        setCurrentFreqIndex(next);
        startFrequency(next);
        playTone();
      }
    } else {
      playTone();
    }
  }

  function handleHeard() {
    respond(true);
    setTimeout(advanceAfterResponse, 100);
  }

  function handleNotHeard() {
    respond(false);
    setTimeout(advanceAfterResponse, 100);
  }

  async function handleFinish() {
    const latest = getHearingTestState();
    const audiogram = latest.result;
    const prescription = audiogramToPrescription(audiogram);
    await setItem(STORAGE_KEYS.AUDIOGRAM, audiogram);
    await setItem(STORAGE_KEYS.PRESCRIPTION, prescription);
    setAudiogramAndPrescription(audiogram, prescription);
    await disposeHearingTestContext();
    router.replace('/(tabs)');
  }

  const containerStyle = useAnimatedStyle(() => ({
    opacity: stepPhase.value,
    transform: [
      { translateY: interpolate(stepPhase.value, [0, 1], [28, 0]) },
      { scale: interpolate(stepPhase.value, [0, 1], [0.98, 1]) },
    ],
  }));

  const summaryAverage = useMemo(() => {
    const sum = AUDIOGRAM_FREQUENCIES.reduce((total, freq) => total + state.result[freq], 0);
    return Math.round(sum / AUDIOGRAM_FREQUENCIES.length);
  }, [state.result]);

  return (
    <View style={styles.root}>
      <ScreenBackdrop />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View style={[styles.stageCanvas, containerStyle]}>
          {step === 'intro' && (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.screenHeader}>
                <View>
                  <Text style={styles.screenEyebrow}>HEARING CALIBRATION</Text>
                  <Text style={styles.screenTitle}>{t('hearingTest.title')}</Text>
                </View>
                <TouchableOpacity style={styles.headerGhostButton} onPress={handleSkip} activeOpacity={0.85}>
                  <Text style={styles.headerGhostText}>{t('hearingTest.skip')}</Text>
                </TouchableOpacity>
              </View>

              <ToneChamber
                accent={available ? COLORS.primary : COLORS.warning}
                primaryLabel={available ? 'READY' : 'LIMITED'}
                secondaryLabel="Pure Tone Sweep"
                tertiaryLabel="Headset Route"
                sensorEnabled={sensorEnabled}
                sensorValue={sensorValue}
              />

              <View style={styles.introPanel}>
                <Text style={styles.panelEyebrow}>MISSION BRIEF</Text>
                <Text style={styles.panelBody}>{t('hearingTest.disclaimer')}</Text>
                <Text style={styles.panelNotice}>{t('hearingTest.headphoneNotice')}</Text>
                {!available && (
                  <Text style={styles.warningText}>{t('hearingTest.notAvailable')}</Text>
                )}
              </View>

              <View style={styles.readinessGrid}>
                <MetricTile
                  label="ENGINE"
                  value={available ? 'READY' : 'OFFLINE'}
                  accent={available ? COLORS.success : COLORS.warning}
                />
                <MetricTile
                  label="OUTPUT"
                  value="HEADSET"
                  accent={COLORS.primary}
                />
                <MetricTile
                  label="METHOD"
                  value="SWEEP"
                  accent={COLORS.warning}
                />
              </View>

              <View style={styles.actionDock}>
                <TouchableOpacity
                  style={[styles.primaryAction, !available && styles.actionDisabled]}
                  onPress={handleStartTest}
                  disabled={!available || initializing}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryGradient}
                  >
                    {initializing ? (
                      <ActivityIndicator color={COLORS.background} />
                    ) : (
                      <Text style={styles.primaryActionText}>{t('hearingTest.startTest')}</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryAction} onPress={handleSkip} activeOpacity={0.85}>
                  <Text style={styles.secondaryActionText}>{t('hearingTest.skip')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {step === 'testing' && (
            <View style={styles.testingScreen}>
              <View style={styles.screenHeader}>
                <View>
                  <Text style={styles.screenEyebrow}>ACOUSTIC TEST</Text>
                  <Text style={styles.screenTitle}>Signal Response</Text>
                </View>
                <View style={styles.progressPill}>
                  <Text style={styles.progressPillText}>
                    {currentFreqIndex + 1} / {totalFreqs}
                  </Text>
                </View>
              </View>

              <ToneChamber
                accent={state.phase === 'playing' ? COLORS.primary : COLORS.success}
                primaryLabel={t('hearingTest.frequency', { freq: activeFreq })}
                secondaryLabel={state.phase === 'playing' ? t('hearingTest.playing') : 'Awaiting response'}
                tertiaryLabel={`${state.currentLevelDb} dB`}
                sensorEnabled={sensorEnabled}
                sensorValue={sensorValue}
              />

              <View style={styles.metricsRow}>
                <MetricTile label="LEVEL" value={`${state.currentLevelDb} dB`} accent={COLORS.primary} compact />
                <MetricTile label="REVERSAL" value={`${state.reversalCount} / 2`} accent={COLORS.warning} compact />
                <MetricTile
                  label="PHASE"
                  value={state.phase === 'playing' ? 'EMIT' : 'LISTEN'}
                  accent={state.phase === 'playing' ? COLORS.primary : COLORS.success}
                  compact
                />
              </View>

              <View style={styles.frequencyPanel}>
                <Text style={styles.panelEyebrow}>FREQUENCY LADDER</Text>
                <View style={styles.frequencyRow}>
                  {AUDIOGRAM_FREQUENCIES.map((freq, index) => {
                    const isActive = activeFreq === freq;
                    const isDone = index < completedCount;
                    return (
                      <View
                        key={freq}
                        style={[
                          styles.frequencyChip,
                          isDone && styles.frequencyChipDone,
                          isActive && styles.frequencyChipActive,
                        ]}
                      >
                        <Text style={[styles.frequencyChipText, isActive && styles.frequencyChipTextActive]}>
                          {freq >= 1000 ? `${freq / 1000}k` : freq}
                        </Text>
                        <Text style={styles.frequencyChipSub}>
                          {isDone ? `${Math.round(state.result[freq])}dB` : isActive ? 'LIVE' : '--'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.responseRow}>
                <TouchableOpacity
                  style={[styles.responsePad, styles.heardPad, state.phase !== 'waiting_response' && styles.actionDisabled]}
                  onPress={handleHeard}
                  disabled={state.phase !== 'waiting_response'}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['rgba(46,240,181,0.24)', 'rgba(8,26,24,0.98)']}
                    style={styles.responseGradient}
                  >
                    <Text style={styles.responseTitle}>{t('hearingTest.heard')}</Text>
                    <Text style={styles.responseSubtitle}>CONFIRM SIGNAL</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.responsePad, styles.missPad, state.phase !== 'waiting_response' && styles.actionDisabled]}
                  onPress={handleNotHeard}
                  disabled={state.phase !== 'waiting_response'}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['rgba(255,122,135,0.18)', 'rgba(25,12,18,0.98)']}
                    style={styles.responseGradient}
                  >
                    <Text style={styles.responseTitle}>{t('hearingTest.notHeard')}</Text>
                    <Text style={styles.responseSubtitle}>NO DETECTION</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.replayButton} onPress={() => playTone()} activeOpacity={0.85}>
                <Text style={styles.replayButtonText}>{t('hearingTest.replay')}</Text>
              </TouchableOpacity>

              <View style={styles.previewPanel}>
                <Text style={styles.panelEyebrow}>THRESHOLD MAP</Text>
                <ThresholdBars
                  audiogram={state.result}
                  activeFreq={activeFreq}
                  completedCount={completedCount}
                  previewLevelDb={state.currentLevelDb}
                />
              </View>
            </View>
          )}

          {step === 'done' && (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.screenHeader}>
                <View>
                  <Text style={styles.screenEyebrow}>RESULT LOCKED</Text>
                  <Text style={styles.screenTitle}>{t('hearingTest.resultPreview')}</Text>
                </View>
              </View>

              <View style={styles.doneHero}>
                <Text style={styles.doneHeroValue}>{summaryAverage} dB</Text>
                <Text style={styles.doneHeroLabel}>Average Threshold</Text>
              </View>

              <View style={styles.previewPanel}>
                <Text style={styles.panelEyebrow}>AUDIOGRAM SNAPSHOT</Text>
                <ThresholdBars
                  audiogram={state.result}
                  activeFreq={null}
                  completedCount={totalFreqs}
                  previewLevelDb={0}
                />
              </View>

              <View style={styles.readinessGrid}>
                <MetricTile label="PROFILE" value="CAPTURED" accent={COLORS.success} />
                <MetricTile label="BANDS" value={`${totalFreqs} FREQ`} accent={COLORS.primary} />
                <MetricTile label="NEXT" value="EQ BUILD" accent={COLORS.warning} />
              </View>

              <TouchableOpacity style={styles.primaryAction} onPress={handleFinish} activeOpacity={0.88}>
                <LinearGradient
                  colors={[COLORS.success, COLORS.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryGradient}
                >
                  <Text style={styles.primaryActionText}>{t('hearingTest.finish')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function ToneChamber({
  accent,
  primaryLabel,
  secondaryLabel,
  tertiaryLabel,
  sensorEnabled,
  sensorValue,
}: {
  accent: string;
  primaryLabel: string;
  secondaryLabel: string;
  tertiaryLabel: string;
  sensorEnabled: boolean;
  sensorValue: RotationSensorValue;
}) {
  const ringA = useSharedValue(0);
  const ringB = useSharedValue(0);
  const pulse = useSharedValue(0);
  const beam = useSharedValue(0);

  useEffect(() => {
    ringA.value = withRepeat(withTiming(360, { duration: 9000, easing: Easing.linear }), -1, false);
    ringB.value = withRepeat(withTiming(-360, { duration: 13000, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    beam.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.linear }), -1, false);
  }, [beam, pulse, ringA, ringB]);

  const shellStyle = useAnimatedStyle(() => {
    const pitch = sensorEnabled ? clamp(sensorValue.value.pitch || 0, -0.45, 0.45) : 0;
    const roll = sensorEnabled ? clamp(sensorValue.value.roll || 0, -0.55, 0.55) : 0;
    return {
      transform: [
        { perspective: 1500 },
        { translateX: roll * 10 },
        { translateY: -pulse.value * 10 - pitch * 8 },
        { rotateX: `${interpolate(pulse.value, [0, 1], [7, 2]) - pitch * 14}deg` },
        { rotateY: `${interpolate(pulse.value, [0, 1], [-4, 4]) + roll * 14}deg` },
      ],
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + pulse.value * 0.34,
    transform: [{ scale: 0.92 + pulse.value * 0.16 }],
  }));

  const ringAStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringA.value}deg` }],
  }));

  const ringBStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringB.value}deg` }],
  }));

  const beamStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + pulse.value * 0.18,
    transform: [
      { translateX: interpolate(beam.value, [0, 1], [-120, 120]) },
      { rotate: '-12deg' },
    ],
  }));

  return (
    <Animated.View style={[styles.chamberShell, shellStyle]}>
      <Animated.View style={[styles.chamberGlow, { backgroundColor: `${accent}1F` }, glowStyle]} />
      <Animated.View style={[styles.chamberRing, { borderColor: `${accent}38` }, ringAStyle]} />
      <Animated.View style={[styles.chamberRingInner, { borderColor: `${accent}22` }, ringBStyle]} />
      <Animated.View style={[styles.chamberBeam, beamStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.18)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <LinearGradient
        colors={[`${accent}22`, 'rgba(5,14,28,0.98)']}
        start={{ x: 0.25, y: 0 }}
        end={{ x: 0.75, y: 1 }}
        style={[styles.chamberCore, { borderColor: `${accent}34` }]}
      >
        <View style={[styles.chamberCoreRim, { borderColor: `${accent}28` }]} />
        <Text style={styles.chamberPrimary}>{primaryLabel}</Text>
        <Text style={[styles.chamberSecondary, { color: accent }]}>{secondaryLabel}</Text>
        <Text style={styles.chamberTertiary}>{tertiaryLabel}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

function MetricTile({
  label,
  value,
  accent,
  compact = false,
}: {
  label: string;
  value: string;
  accent: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.metricTile, compact && styles.metricTileCompact]}>
      <View style={[styles.metricAccent, { backgroundColor: accent }]} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, compact && styles.metricValueCompact]}>{value}</Text>
    </View>
  );
}

function ThresholdBars({
  audiogram,
  activeFreq,
  completedCount,
  previewLevelDb,
}: {
  audiogram: Record<number, number>;
  activeFreq: number | null;
  completedCount: number;
  previewLevelDb: number;
}) {
  return (
    <View style={styles.barGrid}>
      {AUDIOGRAM_FREQUENCIES.map((freq, index) => {
        const active = activeFreq === freq;
        const done = index < completedCount;
        const displayValue = done ? audiogram[freq] : active ? previewLevelDb : 0;
        const normalized = clamp((displayValue + 10) / 90, 0.08, 1);
        const fillColor = active ? COLORS.primary : done ? COLORS.success : COLORS.border;

        return (
          <View key={freq} style={styles.barColumn}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    height: `${normalized * 100}%` as `${number}%`,
                    backgroundColor: fillColor,
                    opacity: done || active ? 1 : 0.26,
                  },
                ]}
              />
            </View>
            <Text style={[styles.barFreqText, active && { color: COLORS.primary }]}>
              {freq >= 1000 ? `${freq / 1000}k` : freq}
            </Text>
            <Text style={styles.barValueText}>
              {done ? `${Math.round(audiogram[freq])}` : active ? `${Math.round(previewLevelDb)}` : '--'}
            </Text>
          </View>
        );
      })}
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
  stageCanvas: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  screenEyebrow: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 2.6,
    marginBottom: 6,
  },
  screenTitle: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.black,
    color: COLORS.text,
  },
  headerGhostButton: {
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(8,17,33,0.56)',
  },
  headerGhostText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  introPanel: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surfaceGlass,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOW.md,
  },
  panelEyebrow: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 2.4,
    marginBottom: SPACING.sm,
  },
  panelBody: {
    fontSize: FONT_SIZE.md,
    lineHeight: 24,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  panelNotice: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    lineHeight: 24,
  },
  warningText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.sm,
    color: COLORS.warning,
    lineHeight: 22,
  },
  readinessGrid: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  metricTile: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(12,21,38,0.82)',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    overflow: 'hidden',
  },
  metricTileCompact: {
    flex: 1,
    minHeight: 96,
  },
  metricAccent: {
    position: 'absolute',
    left: 18,
    top: 0,
    width: 42,
    height: 2,
    borderBottomLeftRadius: 1,
    borderBottomRightRadius: 1,
  },
  metricLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 2.2,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  metricValueCompact: {
    fontSize: FONT_SIZE.lg,
  },
  actionDock: {
    gap: SPACING.md,
  },
  primaryAction: {
    height: 60,
    borderRadius: 22,
    overflow: 'hidden',
    ...SHADOW.primary,
  },
  primaryGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.black,
    color: COLORS.background,
    letterSpacing: 1.2,
  },
  secondaryAction: {
    height: 56,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  testingScreen: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  progressPill: {
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: 'rgba(8,17,33,0.72)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  progressPillText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 1.8,
  },
  chamberShell: {
    width: '100%',
    height: 276,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  chamberGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  chamberRing: {
    position: 'absolute',
    width: 244,
    height: 244,
    borderRadius: 122,
    borderWidth: 1.5,
  },
  chamberRingInner: {
    position: 'absolute',
    width: 196,
    height: 196,
    borderRadius: 98,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  chamberBeam: {
    position: 'absolute',
    width: 210,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  chamberCore: {
    width: 188,
    height: 188,
    borderRadius: 94,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    ...SHADOW.md,
  },
  chamberCoreRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 94,
    borderWidth: 1,
  },
  chamberPrimary: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.black,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  chamberSecondary: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 2.2,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  chamberTertiary: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  frequencyPanel: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceGlass,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  frequencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  frequencyChip: {
    minWidth: 82,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  frequencyChipDone: {
    borderColor: 'rgba(46,240,181,0.3)',
    backgroundColor: 'rgba(46,240,181,0.08)',
  },
  frequencyChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(107,231,255,0.12)',
  },
  frequencyChipText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: FONT_WEIGHT.bold,
  },
  frequencyChipTextActive: {
    color: COLORS.primary,
  },
  frequencyChipSub: {
    marginTop: 4,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  responseRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  responsePad: {
    flex: 1,
    minHeight: 118,
    borderRadius: 24,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  heardPad: {
    borderWidth: 1,
    borderColor: 'rgba(46,240,181,0.26)',
  },
  missPad: {
    borderWidth: 1,
    borderColor: 'rgba(255,122,135,0.22)',
  },
  responseGradient: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  responseTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.black,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  responseSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 2.4,
  },
  replayButton: {
    alignSelf: 'center',
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginBottom: SPACING.md,
  },
  replayButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  previewPanel: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceGlass,
    padding: SPACING.lg,
  },
  barGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 10,
    minHeight: 188,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    height: 132,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 6,
  },
  barFill: {
    width: '100%',
    borderRadius: 12,
  },
  barFreqText: {
    marginTop: 10,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.bold,
  },
  barValueText: {
    marginTop: 4,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  doneHero: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surfaceGlass,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOW.md,
  },
  doneHeroValue: {
    fontSize: 54,
    lineHeight: 60,
    fontWeight: FONT_WEIGHT.black,
    color: COLORS.success,
  },
  doneHeroLabel: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
  },
});

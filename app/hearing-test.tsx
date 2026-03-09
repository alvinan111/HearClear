import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '@constants/theme';
import { setItem } from '@utils/storage';
import { STORAGE_KEYS } from '@constants/trial';
import { useAudioStore } from '@stores/audio-store';
import {
  initHearingTestContext,
  disposeHearingTestContext,
  startFrequency,
  playTone,
  stopTone,
  respond,
  getHearingTestState,
  isHearingTestAvailable,
} from '@services/hearing-test/HearingTestEngine';
import { audiogramToPrescription } from '@services/hearing-test/prescription';
import { AUDIOGRAM_FREQUENCIES } from '@types/audiogram';

export default function HearingTestScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setAudiogramAndPrescription = useAudioStore((s) => s.setAudiogramAndPrescription);

  const [step, setStep] = useState<'intro' | 'testing' | 'done'>('intro');
  const [initializing, setInitializing] = useState(false);
  const [currentFreqIndex, setCurrentFreqIndex] = useState(0);
  const [state, setState] = useState(getHearingTestState());

  const available = isHearingTestAvailable();
  const totalFreqs = AUDIOGRAM_FREQUENCIES.length;

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

  function handleHeard() {
    respond(true);
    setTimeout(() => {
      const s = getHearingTestState();
      setState(s);
      if (s.currentFreqIndex < 0) {
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
    }, 100);
  }

  function handleNotHeard() {
    respond(false);
    setTimeout(() => {
      const s = getHearingTestState();
      setState(s);
      if (s.currentFreqIndex < 0) {
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
    }, 100);
  }

  async function handleFinish() {
    const s = getHearingTestState();
    const audiogram = s.result;
    const prescription = audiogramToPrescription(audiogram);
    await setItem(STORAGE_KEYS.AUDIOGRAM, audiogram);
    await setItem(STORAGE_KEYS.PRESCRIPTION, prescription);
    setAudiogramAndPrescription(audiogram, prescription);
    await disposeHearingTestContext();
    router.replace('/(tabs)');
  }

  if (step === 'intro') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>{t('hearingTest.title')}</Text>
          <Text style={styles.disclaimer}>{t('hearingTest.disclaimer')}</Text>
          <Text style={styles.notice}>{t('hearingTest.headphoneNotice')}</Text>
          {!available && (
            <Text style={styles.notAvailable}>{t('hearingTest.notAvailable')}</Text>
          )}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.primaryBtn, !available && styles.btnDisabled]}
              onPress={handleStartTest}
              disabled={!available || initializing}
            >
              {initializing ? (
                <ActivityIndicator color={COLORS.textInverse} />
              ) : (
                <Text style={styles.primaryBtnText}>{t('hearingTest.startTest')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipBtnText}>{t('hearingTest.skip')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 'testing') {
    const freq = state.currentFreq ?? AUDIOGRAM_FREQUENCIES[currentFreqIndex];
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.testingWrap}>
          <Text style={styles.progress}>
            {currentFreqIndex + 1} / {totalFreqs}
          </Text>
          <Text style={styles.freqLabel}>{t('hearingTest.frequency', { freq })}</Text>
          {state.phase === 'playing' && (
            <Text style={styles.playing}>{t('hearingTest.playing')}</Text>
          )}
          <View style={styles.responseRow}>
            <TouchableOpacity
              style={[styles.responseBtn, styles.heardBtn]}
              onPress={handleHeard}
              disabled={state.phase !== 'waiting_response'}
            >
              <Text style={styles.responseBtnText}>{t('hearingTest.heard')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.responseBtn, styles.notHeardBtn]}
              onPress={handleNotHeard}
              disabled={state.phase !== 'waiting_response'}
            >
              <Text style={styles.responseBtnText}>{t('hearingTest.notHeard')}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.replayBtn}
            onPress={() => playTone()}
          >
            <Text style={styles.replayBtnText}>{t('hearingTest.replay')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t('hearingTest.resultPreview')}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleFinish}>
          <Text style={styles.primaryBtnText}>{t('hearingTest.finish')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  disclaimer: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
    lineHeight: 22,
  },
  notice: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  notAvailable: {
    fontSize: FONT_SIZE.md,
    color: COLORS.warning,
    marginBottom: SPACING.lg,
  },
  buttons: {
    gap: SPACING.md,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textInverse,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  skipBtn: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  testingWrap: {
    flex: 1,
    padding: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progress: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  freqLabel: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    marginBottom: SPACING.xl,
  },
  playing: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  responseRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  responseBtn: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    borderRadius: BORDER_RADIUS.lg,
    minWidth: 120,
    alignItems: 'center',
  },
  heardBtn: {
    backgroundColor: COLORS.success,
  },
  notHeardBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  responseBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  replayBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  replayBtnText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.primary,
  },
});

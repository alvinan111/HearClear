import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettingsStore } from '@stores/settings-store';
import { setItem } from '@utils/storage';
import { STORAGE_KEYS } from '@constants/trial';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '@constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Slide {
  key: string;
  icon: string;
  gradientColors: [string, string];
  titleKey: string;
  descKey: string;
}

const SLIDES: Slide[] = [
  {
    key: 'hearing',
    icon: '👂',
    gradientColors: ['#E8F4FF', '#DBEAFE'],
    titleKey: 'onboarding.slides.hearing.title',
    descKey: 'onboarding.slides.hearing.description',
  },
  {
    key: 'voice',
    icon: '🗣️',
    gradientColors: ['#F0FDF4', '#DCFCE7'],
    titleKey: 'onboarding.slides.voice.title',
    descKey: 'onboarding.slides.voice.description',
  },
  {
    key: 'boneConducting',
    icon: '🎧',
    gradientColors: ['#FFF7ED', '#FED7AA'],
    titleKey: 'onboarding.slides.boneConducting.title',
    descKey: 'onboarding.slides.boneConducting.description',
  },
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setOnboardingDone = useSettingsStore((s) => s.setOnboardingDone);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  async function finish() {
    await setItem(STORAGE_KEYS.ONBOARDING_DONE, true);
    setOnboardingDone(true);
    router.replace('/(tabs)');
  }

  function goNext() {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      finish();
    }
  }

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index ?? 0);
      }
    }
  ).current;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <SlideItem
            slide={item}
            title={t(item.titleKey)}
            description={t(item.descKey)}
          />
        )}
      />

      {/* 跳过按钮 */}
      {currentIndex < SLIDES.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={finish} activeOpacity={0.7}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      )}

      {/* 底部：指示器 + 按钮 */}
      <View style={styles.footer}>
        {/* 点状指示器 */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        {/* 下一步/开始 按钮 */}
        <TouchableOpacity style={styles.nextButton} onPress={goNext} activeOpacity={0.85}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.nextGradient}
          >
            <Text style={styles.nextText}>
              {currentIndex === SLIDES.length - 1
                ? t('onboarding.getStarted')
                : t('onboarding.next')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SlideItem({
  slide,
  title,
  description,
}: {
  slide: Slide;
  title: string;
  description: string;
}) {
  return (
    <LinearGradient colors={slide.gradientColors} style={styles.slide}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{slide.icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  slide: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: 200,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  description: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 32,
  },
  skipButton: {
    position: 'absolute',
    top: 56,
    right: SPACING.xl,
    padding: SPACING.sm,
  },
  skipText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 48,
    paddingHorizontal: SPACING.xl,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    marginBottom: SPACING.xl,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.border,
    marginHorizontal: 5,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 28,
  },
  nextButton: {
    width: '100%',
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  nextGradient: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textInverse,
    letterSpacing: 1,
  },
});

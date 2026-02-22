import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  LayoutChangeEvent,
} from 'react-native';
import {
  COLORS, FONT_SIZE, FONT_WEIGHT, SPACING,
  BORDER_RADIUS, SHADOW, TOUCH_TARGET,
} from '@constants/theme';

interface LargeSliderProps {
  icon: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onValueChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

export default function LargeSlider({
  icon,
  label,
  value,
  min,
  max,
  step = 1,
  disabled = false,
  onValueChange,
  formatValue,
}: LargeSliderProps) {
  const trackWidth = useRef(0);
  const trackX = useRef(0);

  const percentage = ((value - min) / (max - min)) * 100;

  const clampAndStep = useCallback(
    (rawValue: number): number => {
      const clamped = Math.max(min, Math.min(max, rawValue));
      if (step > 0) {
        return Math.round(clamped / step) * step;
      }
      return clamped;
    },
    [min, max, step]
  );

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
    trackX.current = e.nativeEvent.layout.x;
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        updateValue(e.nativeEvent.locationX);
      },
      onPanResponderMove: (e: GestureResponderEvent, _gs: PanResponderGestureState) => {
        updateValue(e.nativeEvent.locationX);
      },
    })
  ).current;

  function updateValue(touchX: number) {
    if (trackWidth.current === 0) return;
    const ratio = Math.max(0, Math.min(1, touchX / trackWidth.current));
    const rawValue = min + ratio * (max - min);
    const stepped = clampAndStep(rawValue);
    onValueChange(stepped);
  }

  const displayValue = formatValue
    ? formatValue(value)
    : Number.isInteger(step)
    ? Math.round(value).toString()
    : value.toFixed(1);

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      {/* 图标 + 标签 */}
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.valueText}>{displayValue}</Text>
      </View>

      {/* 滑轨（可触控区域要大） */}
      <View
        style={styles.trackArea}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percentage}%` }]} />
          {/* 拖拽手柄 */}
          <View style={[styles.thumb, { left: `${percentage}%` }]} />
        </View>

        {/* 端点标签 */}
        <View style={styles.endLabels}>
          <Text style={styles.endLabel}>{formatValue ? formatValue(min) : min}</Text>
          <Text style={styles.endLabel}>{formatValue ? formatValue(max) : max}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOW.sm,
  },
  containerDisabled: {
    opacity: 0.4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  icon: {
    fontSize: 28,
    marginRight: SPACING.sm,
  },
  label: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text,
  },
  valueText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    minWidth: 52,
    textAlign: 'right',
  },
  trackArea: {
    minHeight: TOUCH_TARGET.slider,
    justifyContent: 'center',
  },
  track: {
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    position: 'relative',
    justifyContent: 'center',
  },
  fill: {
    height: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    position: 'absolute',
    left: 0,
  },
  thumb: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    marginLeft: -16,
    top: -10,
    ...SHADOW.md,
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  endLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingHorizontal: 4,
  },
  endLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
});

// ─── 暗色科技风设计令牌 ────────────────────────────────────────────────────

export const COLORS = {
  // 背景层级
  background: '#060B18',       // 最深底色
  surface: '#0D1526',          // 卡片/面板
  surfaceElevated: '#1A2540',  // 悬浮元素
  overlay: 'rgba(6,11,24,0.85)',

  // 品牌蓝（主色调）
  primary: '#38BDF8',
  primaryDark: '#0E7AB8',   // 深蓝（用于渐变）
  primaryDim: 'rgba(56,189,248,0.15)',
  primaryGlow: 'rgba(56,189,248,0.35)',

  // 激活绿（运行状态）
  success: '#00E887',
  successDim: 'rgba(0,232,135,0.15)',
  successGlow: 'rgba(0,232,135,0.4)',

  // 警告 / 骨传导模式
  warning: '#FBBF24',
  warningDim: 'rgba(251,191,36,0.15)',

  // 错误
  error: '#F87171',
  errorDim: 'rgba(248,113,113,0.15)',

  // 文字
  text: '#F0F6FF',
  textSecondary: '#94A3B8',
  textMuted: '#4B5A70',

  // 边框 / 分割线
  border: 'rgba(56,189,248,0.18)',
  borderStrong: 'rgba(56,189,248,0.45)',

  // 通用
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // ── 兼容旧变量别名（避免 settings.tsx 批量改动）──
  backgroundSecondary: '#060B18',
  card: '#0D1526',
  primaryLight: 'rgba(56,189,248,0.12)',
  textInverse: '#FFFFFF',
  textDisabled: '#4B5A70',
  danger: '#F87171',
};

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 40,
  display: 56,
};

export const FONT_WEIGHT = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const TOUCH_TARGET = {
  min: 44,
  comfortable: 56,
  large: 72,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const SHADOW = {
  primary: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  success: {
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 12,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
};

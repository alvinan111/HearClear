/**
 * 音频引擎默认配置
 */

export const AUDIO_CONFIG = {
  /** 采样率 */
  SAMPLE_RATE: 44100,

  /** 默认增益（dB） */
  DEFAULT_GAIN: 6.0,
  MIN_GAIN: 0,
  MAX_GAIN_NORMAL: 36,          // 普通耳机最大增益 dB（显示为 200%）
  MAX_GAIN_BONE_CONDUCTION: 24, // 骨传导耳机最大增益 dB（显示为 200%）
  MAX_GAIN_SPEAKER: 20,         // 外放模式最大增益 dB（更低防止反馈）

  /** 人声增强默认强度（0-1） */
  DEFAULT_VOICE_ENHANCE: 0.6,

  /** 环境噪音抑制阈值（0-1，值越大过滤越激进） */
  DEFAULT_NOISE_GATE: 0.3,

  /** 多段 EQ 配置（人声增强） */
  EQ_BANDS: [
    { type: 'lowshelf' as const, frequency: 100, gain: -8, q: 1.0 },   // 压低低频噪音
    { type: 'peaking' as const, frequency: 250, gain: 3, q: 1.0 },      // 人声基频
    { type: 'peaking' as const, frequency: 1000, gain: 6, q: 0.8 },     // 核心共振峰
    { type: 'peaking' as const, frequency: 2500, gain: 5, q: 1.0 },     // 语言清晰度
    { type: 'peaking' as const, frequency: 4000, gain: 3, q: 1.2 },     // 齿音/辅音
    { type: 'highshelf' as const, frequency: 8000, gain: -6, q: 1.0 },  // 压低高频噪音
  ],

  /** AEC 回声消除配置 */
  AEC: {
    /** 骨传导模式回声消除强度（0-1） */
    BONE_CONDUCTION_STRENGTH: 0.9,
    /** 普通模式回声消除强度（0-1） */
    NORMAL_STRENGTH: 0.6,
  },

  /** 自适应反馈抑制（防啸叫） */
  FEEDBACK_SUPPRESSOR: {
    /** 啸叫检测窗口（ms），骨传导模式更快 */
    DETECTION_WINDOW_NORMAL: 50,
    DETECTION_WINDOW_BONE: 30,
    /** 啸叫能量上升阈值 */
    THRESHOLD_DB: 15,
    /** 检测到啸叫后自动降低的增益量（dB） */
    AUTO_GAIN_REDUCTION: 1,
    /** Notch 滤波器 Q 值 */
    NOTCH_Q: 30,
  },

  /** 骨传导耳机低频补偿 */
  BONE_CONDUCTION_COMPENSATION: {
    frequency: 350,
    gain: 3,
    q: 1.0,
  },
};

/** 耳机/输出模式 */
export enum HeadphoneMode {
  NORMAL = 'normal',
  BONE_CONDUCTION = 'bone_conduction',
  SPEAKER = 'speaker',  // 手机外放（无耳机时使用）
}

/** 预设配置 */
export const AUDIO_PRESETS: Record<HeadphoneMode, {
  maxGain: number;
  aecStrength: number;
  feedbackDetectionWindow: number;
  useSpeaker: boolean;
  extraEQ?: { frequency: number; gain: number; q: number };
}> = {
  [HeadphoneMode.NORMAL]: {
    maxGain: AUDIO_CONFIG.MAX_GAIN_NORMAL,
    aecStrength: AUDIO_CONFIG.AEC.NORMAL_STRENGTH,
    feedbackDetectionWindow: AUDIO_CONFIG.FEEDBACK_SUPPRESSOR.DETECTION_WINDOW_NORMAL,
    useSpeaker: false,
  },
  [HeadphoneMode.BONE_CONDUCTION]: {
    maxGain: AUDIO_CONFIG.MAX_GAIN_BONE_CONDUCTION,
    aecStrength: AUDIO_CONFIG.AEC.BONE_CONDUCTION_STRENGTH,
    feedbackDetectionWindow: AUDIO_CONFIG.FEEDBACK_SUPPRESSOR.DETECTION_WINDOW_BONE,
    useSpeaker: false,
    extraEQ: AUDIO_CONFIG.BONE_CONDUCTION_COMPENSATION,
  },
  [HeadphoneMode.SPEAKER]: {
    maxGain: AUDIO_CONFIG.MAX_GAIN_SPEAKER,
    aecStrength: 0.95,                  // 外放需要极强 AEC 防止回声
    feedbackDetectionWindow: AUDIO_CONFIG.FEEDBACK_SUPPRESSOR.DETECTION_WINDOW_BONE,
    useSpeaker: true,
    // 外放模式：减少低频提升中高频清晰度
    extraEQ: { frequency: 200, gain: -4, q: 0.8 },
  },
};

/**
 * 音频引擎默认配置
 */

export const AUDIO_CONFIG = {
  /** 采样率 */
  SAMPLE_RATE: 44100,

  /** 默认增益（dB）：人声放大 4 倍（+12dB） */
  DEFAULT_GAIN: 12,
  MIN_GAIN: 0,
  MAX_GAIN_NORMAL: 38,          // 普通耳机最大增益 dB
  MAX_GAIN_BONE_CONDUCTION: 26, // 骨传导耳机最大增益 dB
  MAX_GAIN_SPEAKER: 18,         // 外放模式：略压低上限防回音

  /** 人声增强默认强度（0-1），默认拉满强调人声 */
  DEFAULT_VOICE_ENHANCE: 1,

  /** 环境音抑制（0-1）：1 = 全部过滤掉（噪声门关时增益为 0） */
  DEFAULT_NOISE_GATE: 1,

  /** 噪声门控（见 docs/latency-and-vad-roadmap.md） */
  GATE: {
    /** 门控决策周期（ms），越小延迟越低，建议 20–30 */
    UPDATE_MS: 25,
    /** 门关→开渐变时间（ms），建议 10–30 */
    ATTACK_MS: 20,
    /** 门开→关渐变时间（ms），建议 80–150，避免句尾被切 */
    RELEASE_MS: 120,
    /** 是否使用软门（增益连续变化），true 时听感更自然 */
    SOFT_ENABLED: false,
  },

  /** 场景预设：TV 拾音等，覆盖 GATE 与阈值系数（见 Phase 3） */
  SCENE_PRESETS: {
    default: {
      gateUpdateMs: 25,
      gateAttackMs: 20,
      gateReleaseMs: 120,
      /** 阈值 = THRESHOLD_BASE + noiseGate * THRESHOLD_SCALE；提高 scale 加强环境音抑制 */
      thresholdBase: 0.002,
      thresholdScale: 0.052,
    },
    /** 电视前：门限略低便于电视对白通过，release 略长减少句尾被切 */
    tv: {
      gateUpdateMs: 25,
      gateAttackMs: 20,
      gateReleaseMs: 165,
      thresholdBase: 0.001,
      thresholdScale: 0.038,
    },
  } as const,

  /** 电视场景专用 EQ：强化对白频段 1.6kHz（电视人声清晰度） */
  TV_SCENE_EQ: { frequency: 1600, gain: 2.5, q: 0.8 } as const,

  /** 多段 EQ：加强环境音压（低/高架）与人声段提升 */
  EQ_BANDS: [
    { type: 'lowshelf' as const, frequency: 100, gain: -11, q: 1.0 },   // 更强压低低频（空调/交通）
    { type: 'peaking' as const, frequency: 250, gain: 4, q: 1.0 },      // 人声基频
    { type: 'peaking' as const, frequency: 800, gain: 3, q: 0.8 },      // 人声厚度
    { type: 'peaking' as const, frequency: 1000, gain: 7, q: 0.75 },     // 核心共振峰
    { type: 'peaking' as const, frequency: 2500, gain: 6, q: 1.0 },     // 语言清晰度
    { type: 'peaking' as const, frequency: 4000, gain: 4, q: 1.1 },    // 齿音/辅音
    { type: 'highshelf' as const, frequency: 8000, gain: -9, q: 1.0 },   // 更强压低高频噪音（嘶嘶）
  ],

  /** AEC 回声消除：依赖系统（iOS voiceChat / Android VOICE_COMMUNICATION），不能有一点回音时需启用 */
  AEC: {
    BONE_CONDUCTION_STRENGTH: 0.95,
    NORMAL_STRENGTH: 0.9,
  },

  /** 自适应反馈抑制（防啸叫）- 激进：核心是放大，优先杜绝啸叫 */
  FEEDBACK_SUPPRESSOR: {
    /** 啸叫检测窗口（ms），越小反应越快 */
    DETECTION_WINDOW_MS: 10,
    /** 啸叫能量上升阈值（dB），越小越敏感 */
    THRESHOLD_DB: 5,
    /** Notch 滤波器 Q 值，越大频点越尖 */
    NOTCH_Q: 36,
    /** 自适应 Notch 数量（可同时压多个啸叫频点） */
    NOTCH_COUNT: 7,
    /** 输出限幅：超过此 dB 即压（更早触发） */
    LIMITER_THRESHOLD_DB: -22,
    /** 限幅时主通路乘的增益（压得更狠） */
    LIMITER_GAIN_REDUCTION: 0.72,
    /** 检测到啸叫的绝对门限（dB），高于此才认为在啸叫 */
    PEAK_THRESHOLD_DB: -38,
    /** 解除啸叫提示的门限（dB），低于此才清除 UI 提示 */
    RELEASE_THRESHOLD_DB: -52,
    /** 预防性固定 Notch：常见啸叫频点轻衰减（Hz, dB, Q），在自适应 Notch 前插入 */
    PREVENTIVE_NOTCHES: [
      { frequency: 1000, gain: -1.5, q: 0.9 },
      { frequency: 1800, gain: -1.5, q: 0.9 },
      { frequency: 2500, gain: -1.5, q: 0.9 },
      { frequency: 3200, gain: -1.5, q: 0.9 },
    ] as Array<{ frequency: number; gain: number; q: number }>,
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
  useSpeaker: boolean;
  extraEQ?: { frequency: number; gain: number; q: number };
}> = {
  [HeadphoneMode.NORMAL]: {
    maxGain: AUDIO_CONFIG.MAX_GAIN_NORMAL,
    aecStrength: AUDIO_CONFIG.AEC.NORMAL_STRENGTH,
    useSpeaker: false,
  },
  [HeadphoneMode.BONE_CONDUCTION]: {
    maxGain: AUDIO_CONFIG.MAX_GAIN_BONE_CONDUCTION,
    aecStrength: AUDIO_CONFIG.AEC.BONE_CONDUCTION_STRENGTH,
    useSpeaker: false,
    extraEQ: AUDIO_CONFIG.BONE_CONDUCTION_COMPENSATION,
  },
  [HeadphoneMode.SPEAKER]: {
    maxGain: AUDIO_CONFIG.MAX_GAIN_SPEAKER,
    aecStrength: 0.95,                  // 外放需要极强 AEC 防止回声
    useSpeaker: true,
    // 外放模式：减少低频提升中高频清晰度
    extraEQ: { frequency: 200, gain: -4, q: 0.8 },
  },
};

/** UI 可选输出设备（仅耳机/骨传导，不含外放）— 用于首页设备选择，防止误用 SPEAKER */
export const OUTPUT_DEVICE_OPTIONS: ReadonlyArray<HeadphoneMode> = [
  HeadphoneMode.NORMAL,
  HeadphoneMode.BONE_CONDUCTION,
] as const;

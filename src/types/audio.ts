import { HeadphoneMode } from '@config/audio';
import type { Audiogram, Prescription, FeedbackCorrection } from '@types/audiogram';

/** 使用场景：默认 / TV 拾音（手机放电视旁） */
export type AudioScene = 'default' | 'tv';

export interface AudioParams {
  /** 增益（放大）级别，0-20 */
  gain: number;
  /** 人声增强强度，0-1 */
  voiceEnhance: number;
  /** 环境噪音抑制阈值，0-1 */
  noiseGate: number;
  /** 耳机模式 */
  headphoneMode: HeadphoneMode;
  /** 场景预设：TV 拾音时用较长 release、稍低阈值 */
  scene?: AudioScene;
  /** 神经降噪（RNNoise/GTCRN）：实时麦克风增强，需原生模块支持，默认关闭 */
  neuralDenoiser?: boolean;
  /** 听力图（可选，完成听力测试后有值） */
  audiogram?: Audiogram | null;
  /** 处方增益（由听力图计算，有则启用个性化放大） */
  prescription?: Prescription | null;
  /** 用户反馈修正（运行中调节，持久化） */
  feedbackCorrection?: FeedbackCorrection | null;
}

export interface AudioEngineState {
  /** 音频引擎是否运行中 */
  isRunning: boolean;
  /** AEC（回声消除）是否激活 */
  aecActive: boolean;
  /** 当前检测到的啸叫频率（Hz），null 表示无啸叫 */
  feedbackFrequency: number | null;
  /** 耳机是否已连接 */
  headphoneConnected: boolean;
}

export type AudioEngineStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'error';

export interface AudioError {
  code: 'NO_HEADPHONE' | 'PERMISSION_DENIED' | 'ENGINE_ERROR' | 'DEVICE_NOT_SUPPORTED';
  message: string;
}

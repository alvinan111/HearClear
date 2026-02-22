import { HeadphoneMode } from '@config/audio';

export interface AudioParams {
  /** 增益（放大）级别，0-20 */
  gain: number;
  /** 人声增强强度，0-1 */
  voiceEnhance: number;
  /** 环境噪音抑制阈值，0-1 */
  noiseGate: number;
  /** 耳机模式 */
  headphoneMode: HeadphoneMode;
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

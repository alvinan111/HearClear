import { create } from 'zustand';
import { HeadphoneMode, AUDIO_CONFIG } from '@config/audio';
import type { AudioParams, AudioEngineStatus, AudioError } from '@types/audio';

interface AudioStore {
  /** 当前音频参数 */
  params: AudioParams;
  /** 引擎运行状态 */
  status: AudioEngineStatus;
  /** 耳机是否连接 */
  headphoneConnected: boolean;
  /** 当前检测到的啸叫频率 */
  feedbackFrequency: number | null;
  /** 最近一次错误 */
  error: AudioError | null;
  /** 配置是否被锁定（离线且未付费时） */
  configLocked: boolean;

  /** Actions */
  setStatus: (status: AudioEngineStatus) => void;
  setHeadphoneConnected: (connected: boolean) => void;
  setFeedbackFrequency: (freq: number | null) => void;
  setError: (error: AudioError | null) => void;
  setConfigLocked: (locked: boolean) => void;
  updateParams: (partial: Partial<AudioParams>) => void;
  resetParams: () => void;
}

const DEFAULT_PARAMS: AudioParams = {
  gain: AUDIO_CONFIG.DEFAULT_GAIN,
  voiceEnhance: AUDIO_CONFIG.DEFAULT_VOICE_ENHANCE,
  noiseGate: AUDIO_CONFIG.DEFAULT_NOISE_GATE,
  headphoneMode: HeadphoneMode.NORMAL,
};

export const useAudioStore = create<AudioStore>((set, get) => ({
  params: DEFAULT_PARAMS,
  status: 'idle',
  headphoneConnected: false,
  feedbackFrequency: null,
  error: null,
  configLocked: false,

  setStatus: (status) => set({ status }),
  setHeadphoneConnected: (connected) => set({ headphoneConnected: connected }),
  setFeedbackFrequency: (freq) => set({ feedbackFrequency: freq }),
  setError: (error) => set({ error }),
  setConfigLocked: (locked) => set({ configLocked: locked }),

  updateParams: (partial) => {
    if (get().configLocked) return; // 离线未付费时禁止修改
    set((state) => ({ params: { ...state.params, ...partial } }));
  },

  resetParams: () => {
    if (get().configLocked) return;
    set({ params: DEFAULT_PARAMS });
  },
}));

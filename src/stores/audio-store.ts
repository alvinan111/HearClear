import { create } from 'zustand';
import { HeadphoneMode, AUDIO_CONFIG } from '@config/audio';
import type { AudioParams, AudioEngineStatus, AudioError } from '@/types/audio';
import {
  DEFAULT_FEEDBACK_CORRECTION,
  isAudiogram,
  isPrescription,
  isFeedbackCorrection,
} from '@/types/audiogram';
import { getItem } from '@utils/storage';
import { STORAGE_KEYS } from '@constants/trial';

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
  /** 设置听力图与处方（完成听力测试后调用） */
  setAudiogramAndPrescription: (audiogram: AudioParams['audiogram'], prescription: AudioParams['prescription']) => void;
  /** 更新反馈修正并合并到 params */
  updateFeedbackCorrection: (partial: Partial<AudioParams['feedbackCorrection']>) => void;
  /** 从 AsyncStorage 加载 audiogram / prescription / feedbackCorrection 并合并到 params（启动时调用） */
  hydrateFromStorage: () => Promise<void>;
}

const DEFAULT_PARAMS: AudioParams = {
  gain: AUDIO_CONFIG.DEFAULT_GAIN,
  voiceEnhance: AUDIO_CONFIG.DEFAULT_VOICE_ENHANCE,
  noiseGate: AUDIO_CONFIG.DEFAULT_NOISE_GATE,
  headphoneMode: HeadphoneMode.NORMAL,
  scene: 'default',
  neuralDenoiser: true,
  audiogram: null,
  prescription: null,
  feedbackCorrection: null,
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

  setAudiogramAndPrescription: (audiogram, prescription) => {
    set((state) => ({
      params: { ...state.params, audiogram, prescription },
    }));
  },

  updateFeedbackCorrection: (partial) => {
    set((state) => {
      const current = state.params.feedbackCorrection ?? DEFAULT_FEEDBACK_CORRECTION;
      const next = {
        ...current,
        ...partial,
      };
      return { params: { ...state.params, feedbackCorrection: next } };
    });
  },

  hydrateFromStorage: async () => {
    const [audiogram, prescription, feedbackCorrection] = await Promise.all([
      getItem<unknown>(STORAGE_KEYS.AUDIOGRAM),
      getItem<unknown>(STORAGE_KEYS.PRESCRIPTION),
      getItem<unknown>(STORAGE_KEYS.FEEDBACK_CORRECTION),
    ]);
    set((state) => {
      const next = { ...state.params };
      if (isAudiogram(audiogram)) next.audiogram = audiogram;
      if (isPrescription(prescription)) next.prescription = prescription;
      if (isFeedbackCorrection(feedbackCorrection)) {
        next.feedbackCorrection = {
          ...DEFAULT_FEEDBACK_CORRECTION,
          ...feedbackCorrection,
        };
      }
      return { params: next };
    });
  },
}));

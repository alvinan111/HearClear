/**
 * AudioEngine - 核心音频处理引擎
 *
 * 使用 react-native-audio-api 正确的麦克风接入方式：
 *   AudioRecorder → createRecorderAdapter() → [处理链] → destination
 *
 * 处理管线：
 *   麦克风 → RecorderAdapterNode → [环境音AnalyserNode]
 *          → EQ → NoiseGate → MainGain → [人声AnalyserNode]
 *          → FeedbackNotch × 2 → destination（耳机/外放）
 *
 * Expo Go：无 react-native-audio-api，以 mock 模式运行（仅 UI 演示）。
 * Dev Build：真实音频处理 + 输出到耳机/扬声器。
 */

import { AUDIO_CONFIG, AUDIO_PRESETS, HeadphoneMode } from '@config/audio';
import type { AudioParams, AudioError } from '@types/audio';
import { useAudioStore } from '@stores/audio-store';

// ─── Native 模块动态加载 ──────────────────────────────────────────────────────
let AudioContextClass: (new (options?: { sampleRate?: number }) => import('react-native-audio-api').AudioContext) | null = null;
let AudioRecorderClass: (new () => import('react-native-audio-api').AudioRecorder) | null = null;
let isNativeAvailable = false;

try {
  const api = require('react-native-audio-api');
  AudioContextClass = api.AudioContext;
  AudioRecorderClass = api.AudioRecorder;
  isNativeAvailable = !!AudioContextClass && !!AudioRecorderClass;
} catch {
  isNativeAvailable = false;
}

// ─── 节点类型别名 ─────────────────────────────────────────────────────────────
type Ctx = import('react-native-audio-api').AudioContext;
type GainNode = import('react-native-audio-api').GainNode;
type BiquadFilterNode = import('react-native-audio-api').BiquadFilterNode;
type AnalyserNode = import('react-native-audio-api').AnalyserNode;
type AudioNode = import('react-native-audio-api').AudioNode;
type AudioRecorderType = import('react-native-audio-api').AudioRecorder;
type RecorderAdapterNode = import('react-native-audio-api').RecorderAdapterNode;

// ─── 引擎内部状态 ─────────────────────────────────────────────────────────────
interface EngineState {
  ctx: Ctx | null;
  recorder: AudioRecorderType | null;
  isRunning: boolean;
  feedbackInterval: ReturnType<typeof setInterval> | null;
  rawAnalyser: AnalyserNode | null;   // 原始麦克风（环境音）
  voiceAnalyser: AnalyserNode | null; // 处理后（人声）
  rawBuf: Float32Array;
  voiceBuf: Float32Array;
}

const FFT_SIZE = 2048;

const state: EngineState = {
  ctx: null,
  recorder: null,
  isRunning: false,
  feedbackInterval: null,
  rawAnalyser: null,
  voiceAnalyser: null,
  rawBuf: new Float32Array(FFT_SIZE / 2),
  voiceBuf: new Float32Array(FFT_SIZE / 2),
};

// ─── 公共 API ─────────────────────────────────────────────────────────────────
export const AudioEngine = {
  get isAvailable() { return isNativeAvailable; },

  // ── 启动 ──────────────────────────────────────────────────────────────────
  async start(params: AudioParams): Promise<{ error: AudioError | null }> {
    if (!isNativeAvailable) {
      state.isRunning = true;
      console.info('[AudioEngine] Mock mode (Expo Go) - no real audio processing');
      return { error: null };
    }

    try {
      await AudioEngine.stop();

      // ── 创建 AudioContext ────────────────────────────────────────────────
      const ctx = new AudioContextClass!();
      state.ctx = ctx;
      const sr = ctx.sampleRate;
      const preset = AUDIO_PRESETS[params.headphoneMode];

      // ── 创建麦克风输入节点（正确方式：RecorderAdapterNode）────────────────
      const adapterNode: RecorderAdapterNode = ctx.createRecorderAdapter();
      const recorder: AudioRecorderType = new AudioRecorderClass!();
      recorder.connect(adapterNode);
      state.recorder = recorder;

      // ── 环境音分析器（原始信号）────────────────────────────────────────
      const rawA: AnalyserNode = ctx.createAnalyser();
      rawA.fftSize = FFT_SIZE;
      rawA.smoothingTimeConstant = 0.75;
      state.rawAnalyser = rawA;
      state.rawBuf = new Float32Array(rawA.frequencyBinCount);
      adapterNode.connect(rawA as unknown as AudioNode);

      // ── 人声 EQ 滤波器组 ────────────────────────────────────────────────
      const eqFilters: BiquadFilterNode[] = AUDIO_CONFIG.EQ_BANDS.map((b) => {
        const f: BiquadFilterNode = ctx.createBiquadFilter();
        f.type = b.type as BiquadFilterNode['type'];
        f.frequency.value = b.frequency;
        f.gain.value = b.gain * params.voiceEnhance;
        f.Q.value = b.q;
        return f;
      });

      if (params.headphoneMode === HeadphoneMode.BONE_CONDUCTION && preset.extraEQ) {
        const bc: BiquadFilterNode = ctx.createBiquadFilter();
        bc.type = 'peaking';
        bc.frequency.value = preset.extraEQ.frequency;
        bc.gain.value = preset.extraEQ.gain;
        bc.Q.value = preset.extraEQ.q;
        eqFilters.push(bc);
      }

      // ── 噪音门 ──────────────────────────────────────────────────────────
      const noiseGate: GainNode = ctx.createGain();
      noiseGate.gain.value = 1 - params.noiseGate * 0.8;

      // ── 主增益 ──────────────────────────────────────────────────────────
      const mainGain: GainNode = ctx.createGain();
      mainGain.gain.value = dbToLinear(Math.min(params.gain, preset.maxGain));

      // ── 人声分析器（处理后信号）────────────────────────────────────────
      const voiceA: AnalyserNode = ctx.createAnalyser();
      voiceA.fftSize = FFT_SIZE;
      voiceA.smoothingTimeConstant = 0.82;
      state.voiceAnalyser = voiceA;
      state.voiceBuf = new Float32Array(voiceA.frequencyBinCount);

      // ── 反馈抑制 Notch 滤波器 × 2 ──────────────────────────────────────
      const notches: BiquadFilterNode[] = [0, 1].map(() => {
        const n: BiquadFilterNode = ctx.createBiquadFilter();
        n.type = 'notch';
        n.frequency.value = 2000;
        n.Q.value = AUDIO_CONFIG.FEEDBACK_SUPPRESSOR.NOTCH_Q;
        return n;
      });

      // ── 连接处理链 ───────────────────────────────────────────────────────
      // adapterNode → rawA → EQ[0..n] → noiseGate → mainGain → voiceA → notch[0] → notch[1] → destination
      let prev: AudioNode = rawA as unknown as AudioNode;
      for (const f of eqFilters) {
        prev.connect(f as unknown as AudioNode);
        prev = f as unknown as AudioNode;
      }
      prev.connect(noiseGate as unknown as AudioNode);
      (noiseGate as unknown as AudioNode).connect(mainGain as unknown as AudioNode);
      (mainGain as unknown as AudioNode).connect(voiceA as unknown as AudioNode);
      (voiceA as unknown as AudioNode).connect(notches[0] as unknown as AudioNode);
      (notches[0] as unknown as AudioNode).connect(notches[1] as unknown as AudioNode);
      (notches[1] as unknown as AudioNode).connect(ctx.destination as unknown as AudioNode);

      // ── 启动麦克风录制（开始捕获声音） ──────────────────────────────────
      recorder.start();

      // ── 启动反馈检测循环 ─────────────────────────────────────────────────
      startFeedbackLoop(ctx, notches, sr, params.headphoneMode);

      state.isRunning = true;
      return { error: null };
    } catch (e) {
      const err = e as Error;
      const isPerm = /permission|notallowed|denied/i.test(err.message ?? '');
      console.error('[AudioEngine] start failed:', err.message);
      return {
        error: {
          code: isPerm ? 'PERMISSION_DENIED' : 'ENGINE_ERROR',
          message: err.message,
        },
      };
    }
  },

  // ── 停止 ──────────────────────────────────────────────────────────────────
  async stop(): Promise<void> {
    if (state.feedbackInterval) {
      clearInterval(state.feedbackInterval);
      state.feedbackInterval = null;
    }

    // 停止麦克风录制
    if (state.recorder) {
      try { state.recorder.stop(); } catch { /**/ }
      state.recorder = null;
    }

    state.rawAnalyser = null;
    state.voiceAnalyser = null;

    if (state.ctx) {
      try { await state.ctx.close(); } catch { /**/ }
      state.ctx = null;
    }

    state.isRunning = false;
    useAudioStore.getState().setFeedbackFrequency(null);
  },

  // ── 对外暴露频谱数据（每帧调用） ──────────────────────────────────────────
  getSpectrumData(numBars = 24): { voice: number[]; env: number[] } | null {
    if (!state.isRunning || !isNativeAvailable) return null;

    const sr = state.ctx?.sampleRate ?? 44100;
    const binCount = state.rawBuf.length;
    const hzPerBin = (sr / 2) / binCount;

    const VOICE_LO = 300, VOICE_HI = 3500;
    const ENV_LO1 = 30, ENV_HI1 = 300;
    const ENV_LO2 = 3500, ENV_HI2 = 8000;

    state.voiceAnalyser?.getFloatFrequencyData(state.voiceBuf);
    state.rawAnalyser?.getFloatFrequencyData(state.rawBuf);

    const voice = extractBars(state.voiceBuf, binCount, hzPerBin, VOICE_LO, VOICE_HI, numBars);
    const envLow = extractBars(state.rawBuf, binCount, hzPerBin, ENV_LO1, ENV_HI1, numBars >> 1);
    const envHigh = extractBars(state.rawBuf, binCount, hzPerBin, ENV_LO2, ENV_HI2, numBars - (numBars >> 1));

    return { voice, env: [...envLow, ...envHigh] };
  },
};

// ─── 辅助函数 ─────────────────────────────────────────────────────────────────
function extractBars(
  buf: Float32Array,
  binCount: number,
  hzPerBin: number,
  freqLo: number,
  freqHi: number,
  numBars: number
): number[] {
  const lo = Math.floor(freqLo / hzPerBin);
  const hi = Math.min(Math.ceil(freqHi / hzPerBin), binCount - 1);
  const totalBins = hi - lo;
  if (totalBins <= 0 || numBars <= 0) return new Array(numBars).fill(0);

  const bars: number[] = [];
  const binsPerBar = totalBins / numBars;

  for (let i = 0; i < numBars; i++) {
    const start = lo + Math.floor(i * binsPerBar);
    const end = lo + Math.floor((i + 1) * binsPerBar);
    let maxDb = -120;
    for (let b = start; b < end && b < binCount; b++) {
      if (buf[b] > maxDb) maxDb = buf[b];
    }
    bars.push(Math.max(0, Math.min(1, (maxDb + 100) / 80)));
  }
  return bars;
}

function startFeedbackLoop(
  ctx: Ctx,
  notches: BiquadFilterNode[],
  sr: number,
  mode: HeadphoneMode
): void {
  try {
    const analyser: AnalyserNode = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.85;
    (notches[notches.length - 1] as unknown as AudioNode).connect(analyser as unknown as AudioNode);

    const buf = new Float32Array(analyser.frequencyBinCount);
    const hzPerBin = (sr / 2) / buf.length;
    const window = mode === HeadphoneMode.BONE_CONDUCTION
      ? AUDIO_CONFIG.FEEDBACK_SUPPRESSOR.DETECTION_WINDOW_BONE
      : AUDIO_CONFIG.FEEDBACK_SUPPRESSOR.DETECTION_WINDOW_NORMAL;

    let prevMax = -Infinity;
    let notchIdx = 0;

    state.feedbackInterval = setInterval(() => {
      analyser.getFloatFrequencyData(buf);
      let maxDb = -Infinity, maxBin = 0;
      const lo = Math.floor(300 / hzPerBin);
      const hi = Math.floor(6000 / hzPerBin);
      for (let i = lo; i < hi; i++) {
        if (buf[i] > maxDb) { maxDb = buf[i]; maxBin = i; }
      }
      const freq = maxBin * hzPerBin;
      const rise = maxDb - prevMax;
      if (rise > AUDIO_CONFIG.FEEDBACK_SUPPRESSOR.THRESHOLD_DB && maxDb > -30) {
        const n = notches[notchIdx % notches.length];
        n.frequency.value = freq;
        n.gain.value = -AUDIO_CONFIG.FEEDBACK_SUPPRESSOR.AUTO_GAIN_REDUCTION;
        notchIdx++;
        useAudioStore.getState().setFeedbackFrequency(freq);
      } else if (maxDb < -50) {
        useAudioStore.getState().setFeedbackFrequency(null);
      }
      prevMax = maxDb;
    }, window);
  } catch { /**/ }
}

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

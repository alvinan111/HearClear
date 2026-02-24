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
import { clampGainForPreset, dbToLinear as dbToLinearUtil } from '@services/audio/audioUtils';

// ─── Native 模块动态加载 ──────────────────────────────────────────────────────
let AudioContextClass: (new (options?: { sampleRate?: number }) => import('react-native-audio-api').AudioContext) | null = null;
let AudioRecorderClass: (new () => import('react-native-audio-api').AudioRecorder) | null = null;
let AudioManager: import('react-native-audio-api').default | null = null;
let isNativeAvailable = false;

try {
  const api = require('react-native-audio-api');
  AudioContextClass = api.AudioContext;
  AudioRecorderClass = api.AudioRecorder;
  AudioManager = api.AudioManager;
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

/** 啸叫抑制策略：平台 AEC + 自适应 Notch + 输出限幅，见 docs/feedback-suppression.md */

// ─── 引擎内部状态 ─────────────────────────────────────────────────────────────
const GATE_ANALYSER_FFT = 2048;
const GATE_CLOSED_GAIN = 0; // 杂音全关，只留人声
const VOICE_BAND_LOW_HZ = 200;
const VOICE_BAND_HIGH_HZ = 4000;
const VOICE_BANDPASS_LOW = 180;
const VOICE_BANDPASS_HIGH = 4200;

interface EngineState {
  ctx: Ctx | null;
  recorder: AudioRecorderType | null;
  isRunning: boolean;
  rawAnalyser: AnalyserNode | null;
  voiceAnalyser: AnalyserNode | null;
  gateAnalyser: AnalyserNode | null;
  gateGainNode: GainNode | null;
  /** 无耳机时置 0，只采集不输出 */
  outputMuteGain: GainNode | null;
  gateInterval: ReturnType<typeof setInterval> | null;
  gateBuf: Float32Array;
  gateFreqBuf: Float32Array;
  rawBuf: Float32Array;
  voiceBuf: Float32Array;
}

const FFT_SIZE = 2048;

/** Phase1：已移除 10ms JS 反馈环，避免卡死。抑啸仅用固定 Notch + 固定限幅，见 docs/android-feedback-solution.md */

const state: EngineState = {
  ctx: null,
  recorder: null,
  isRunning: false,
  rawAnalyser: null,
  voiceAnalyser: null,
  gateAnalyser: null,
  gateGainNode: null,
  outputMuteGain: null,
  gateInterval: null,
  gateBuf: new Float32Array(GATE_ANALYSER_FFT),
  gateFreqBuf: new Float32Array(GATE_ANALYSER_FFT / 2),
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

      const preset = AUDIO_PRESETS[params.headphoneMode];

      // ── 1. 确保麦克风权限（react-native-audio-api 内部需要）────────────────
      if (AudioManager?.requestRecordingPermissions) {
        const perm = await AudioManager.requestRecordingPermissions();
        if (perm !== 'Granted') {
          return { error: { code: 'PERMISSION_DENIED', message: '麦克风权限未授权' } };
        }
      }

      // ── 2. 配置音频会话（麦克风输入 + 输出路由）；iOS voiceChat 启用系统 AEC ──
      if (AudioManager?.setAudioSessionOptions) {
        const iosOptions: Array<'defaultToSpeaker' | 'allowBluetoothA2DP' | 'allowBluetoothHFP'> = [
          'allowBluetoothA2DP',
          'allowBluetoothHFP',
        ];
        if (preset.useSpeaker) {
          iosOptions.push('defaultToSpeaker');
        }
        try {
          (AudioManager as { setAudioSessionOptions: (o: { iosCategory: string; iosMode: string; iosOptions: string[] }) => void }).setAudioSessionOptions({
            iosCategory: 'playAndRecord',
            iosMode: 'voiceChat', // 启用 Voice Processing I/O，系统级回声/反馈抑制
            iosOptions,
          });
        } catch {
          AudioManager.setAudioSessionOptions({
            iosCategory: 'playAndRecord',
            iosMode: 'default',
            iosOptions,
          });
        }
      }

      // ── 3. 激活音频会话（必须成功，否则麦克风无输入）──────────────────────
      if (AudioManager?.setAudioSessionActivity) {
        const ok = await AudioManager.setAudioSessionActivity(true);
        if (!ok) {
          console.warn('[AudioEngine] setAudioSessionActivity failed, retrying...');
        }
      }

      // ── 4. 耳机连接时：强制使用手机内置麦克风，不用耳机上的麦 ─────────────
      if (AudioManager?.getDevicesInfo && AudioManager?.setInputDevice) {
        try {
          const info = await AudioManager.getDevicesInfo();
          const inputs = info?.availableInputs ?? [];
          const builtIn = inputs.find(
            (d) =>
              /built-in|builtin|internal|phone\s*mic|microphonebuiltin|内置|手机.*麦|听筒/i.test(d.name ?? '') ||
              /builtin|microphonebuiltin/i.test(d.category ?? '')
          ) ?? inputs[0];
          if (builtIn?.id) {
            await AudioManager.setInputDevice(builtIn.id);
          }
        } catch {
          // 忽略：部分机型无 getDevicesInfo/setInputDevice 或枚举失败
        }
      }

      // ── 创建 AudioContext ────────────────────────────────────────────────
      const ctx = new AudioContextClass!();
      state.ctx = ctx;
      const sr = ctx.sampleRate;

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

      // ── 人声带通：只保留 180–4200 Hz，其余全部砍掉（杂音剔除）────────────
      const voiceHighpass: BiquadFilterNode = ctx.createBiquadFilter();
      voiceHighpass.type = 'highpass';
      voiceHighpass.frequency.value = VOICE_BANDPASS_LOW;
      voiceHighpass.Q.value = 0.7;
      const voiceLowpass: BiquadFilterNode = ctx.createBiquadFilter();
      voiceLowpass.type = 'lowpass';
      voiceLowpass.frequency.value = VOICE_BANDPASS_HIGH;
      voiceLowpass.Q.value = 0.7;

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

      // ── 动态噪声门：人声通过、环境音压低；周期 + attack/release 由 GATE 或 SCENE_PRESETS 决定 ────
      const scene = params.scene ?? 'default';
      const scenePreset = AUDIO_CONFIG.SCENE_PRESETS[scene];
      const gateUpdateMs = scenePreset.gateUpdateMs;
      const attackSec = scenePreset.gateAttackMs / 1000;
      const releaseSec = scenePreset.gateReleaseMs / 1000;
      const gateSoft = AUDIO_CONFIG.GATE.SOFT_ENABLED;
      const attackTimeConstant = Math.max(0.001, attackSec / 3);
      const releaseTimeConstant = Math.max(0.001, releaseSec / 3);

      const gateAnalyser: AnalyserNode = ctx.createAnalyser();
      gateAnalyser.fftSize = GATE_ANALYSER_FFT;
      gateAnalyser.smoothingTimeConstant = 0.6;
      const noiseGate: GainNode = ctx.createGain();
      noiseGate.gain.value = 1;
      state.gateAnalyser = gateAnalyser;
      state.gateGainNode = noiseGate;
      state.gateBuf = new Float32Array(gateAnalyser.fftSize);
      state.gateFreqBuf = new Float32Array(gateAnalyser.frequencyBinCount);

      const startGateLoop = () => {
        if (state.gateInterval) return;
        state.gateInterval = setInterval(() => {
          const ana = state.gateAnalyser;
          const gainNode = state.gateGainNode;
          const audioCtx = state.ctx;
          if (!ana || !gainNode || !audioCtx) return;
          const sr = audioCtx.sampleRate ?? 44100;
          const bins = ana.frequencyBinCount;
          const hzPerBin = (sr / 2) / bins;
          ana.getFloatFrequencyData(state.gateFreqBuf);
          const buf = state.gateFreqBuf;
          const lowBin = Math.max(0, Math.floor(VOICE_BAND_LOW_HZ / hzPerBin));
          const highBin = Math.min(bins - 1, Math.ceil(VOICE_BAND_HIGH_HZ / hzPerBin));
          let voiceEnergy = 0;
          for (let i = lowBin; i <= highBin; i++) {
            const db = buf[i];
            if (isFinite(db) && db > -100) voiceEnergy += Math.pow(10, db / 20);
          }
          const storeParams = useAudioStore.getState().params;
          const currentScene = storeParams.scene ?? 'default';
          const preset = AUDIO_CONFIG.SCENE_PRESETS[currentScene];
          const threshold = preset.thresholdBase + storeParams.noiseGate * preset.thresholdScale;
          const now = (audioCtx as { currentTime?: number }).currentTime ?? 0;

          if (gateSoft) {
            const targetGain = voiceEnergy > threshold
              ? Math.min(1, 0.1 + (voiceEnergy - threshold) * 4)
              : GATE_CLOSED_GAIN;
            const tc = voiceEnergy > threshold ? attackTimeConstant : releaseTimeConstant;
            if (typeof gainNode.gain.setTargetAtTime === 'function') {
              gainNode.gain.setTargetAtTime(targetGain, now, tc);
            } else {
              gainNode.gain.value = targetGain;
            }
          } else {
            const targetGain = voiceEnergy > threshold ? 1 : GATE_CLOSED_GAIN;
            const tc = voiceEnergy > threshold ? attackTimeConstant : releaseTimeConstant;
            if (typeof gainNode.gain.setTargetAtTime === 'function') {
              gainNode.gain.setTargetAtTime(targetGain, now, tc);
            } else {
              gainNode.gain.value = targetGain;
            }
          }
        }, gateUpdateMs);
      };

      // ── 主增益 ──────────────────────────────────────────────────────────
      const mainGain: GainNode = ctx.createGain();
      mainGain.gain.value = dbToLinearUtil(clampGainForPreset(params.gain, preset.maxGain));

      // ── 人声分析器（处理后信号）────────────────────────────────────────
      const voiceA: AnalyserNode = ctx.createAnalyser();
      voiceA.fftSize = FFT_SIZE;
      voiceA.smoothingTimeConstant = 0.82;
      state.voiceAnalyser = voiceA;
      state.voiceBuf = new Float32Array(voiceA.frequencyBinCount);

      // ── 固定抑啸：多频点 Notch 压低易啸频段 + 输出限幅（外放更严，不能有一点回音）────
      const FIXED_NOTCH_FREQS = [1800, 2200, 2600, 3200];
      const fixedNotches: BiquadFilterNode[] = FIXED_NOTCH_FREQS.map((freq) => {
        const n = ctx.createBiquadFilter();
        n.type = 'notch';
        n.frequency.value = freq;
        n.Q.value = 3.2;
        return n;
      });
      const outputLimiter: GainNode = ctx.createGain();
      // 外放易回音→啸叫，严格限幅；耳机可略放宽以保音量
      outputLimiter.gain.value = preset.useSpeaker ? 0.7 : 0.88;

      // ── 输出静音节点：无耳机时置 0，只采集不输出 ─────────────────────────
      const outputMuteGain: GainNode = ctx.createGain();
      outputMuteGain.gain.value = 1;
      state.outputMuteGain = outputMuteGain;

      // ── 连接处理链 ───────────────────────────────────────────────────────
      // rawA → 人声带通(180–4200) → EQ → gateAnalyser → noiseGate → mainGain → voiceA → notches → limiter → outputMuteGain → dest
      let prev: AudioNode = rawA as unknown as AudioNode;
      prev.connect(voiceHighpass as unknown as AudioNode);
      prev = voiceHighpass as unknown as AudioNode;
      prev.connect(voiceLowpass as unknown as AudioNode);
      prev = voiceLowpass as unknown as AudioNode;
      for (const f of eqFilters) {
        prev.connect(f as unknown as AudioNode);
        prev = f as unknown as AudioNode;
      }
      prev.connect(gateAnalyser as unknown as AudioNode);
      (gateAnalyser as unknown as AudioNode).connect(noiseGate as unknown as AudioNode);
      (noiseGate as unknown as AudioNode).connect(mainGain as unknown as AudioNode);
      (mainGain as unknown as AudioNode).connect(voiceA as unknown as AudioNode);
      prev = voiceA as unknown as AudioNode;
      for (const n of fixedNotches) {
        prev.connect(n as unknown as AudioNode);
        prev = n as unknown as AudioNode;
      }
      (prev as AudioNode).connect(outputLimiter as unknown as AudioNode);
      (outputLimiter as unknown as AudioNode).connect(outputMuteGain as unknown as AudioNode);
      (outputMuteGain as unknown as AudioNode).connect(ctx.destination as unknown as AudioNode);

      // ── 恢复 AudioContext（部分平台默认 suspended，不 resume 无音频）────
      await ctx.resume?.().catch(() => {});

      // ── 启动麦克风录制（开始捕获声音） ──────────────────────────────────
      const startResult = recorder.start();
      if (startResult?.status === 'error') {
        const msg = (startResult as { message?: string }).message ?? '麦克风启动失败';
        throw new Error(msg);
      }

      startGateLoop();
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
    if (state.gateInterval) {
      clearInterval(state.gateInterval);
      state.gateInterval = null;
    }
    state.gateAnalyser = null;
    state.gateGainNode = null;
    if (state.recorder) {
      try { state.recorder.stop(); } catch { /**/ }
      state.recorder = null;
    }

    if (state.ctx) {
      try { await state.ctx.close(); } catch { /**/ }
      state.ctx = null;
    }

    if (AudioManager?.setAudioSessionActivity) {
      AudioManager.setAudioSessionActivity(false).catch(() => {});
    }

    // ctx 关闭后清空 analyser 引用
    state.rawAnalyser = null;
    state.voiceAnalyser = null;
    state.outputMuteGain = null;
    state.isRunning = false;
    useAudioStore.getState().setFeedbackFrequency(null);
  },

  /** 无耳机时设为 true：继续采集与频谱，但不输出声音 */
  setOutputMuted(muted: boolean): void {
    if (state.outputMuteGain) {
      state.outputMuteGain.gain.value = muted ? 0 : 1;
    }
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


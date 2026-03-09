/**
 * 听力测试引擎：纯音测听，简化 Hughson-Westlake
 * 使用 react-native-audio-api 的 AudioContext.createOscillator() + GainNode 播放纯音
 */

import type { Audiogram, AudiogramFrequency } from '@types/audiogram';
import { AUDIOGRAM_FREQUENCIES, createEmptyAudiogram } from '@types/audiogram';

let AudioContextClass: (new (options?: { sampleRate?: number }) => import('react-native-audio-api').AudioContext) | null = null;
try {
  const api = require('react-native-audio-api');
  AudioContextClass = api.AudioContext;
} catch {
  AudioContextClass = null;
}

type Ctx = import('react-native-audio-api').AudioContext;
type OscillatorNode = import('react-native-audio-api').OscillatorNode;
type GainNode = import('react-native-audio-api').GainNode;

const START_LEVEL_DB = 30;
const STEP_DOWN_DB = 10;
const STEP_UP_DB = 5;
const TONE_DURATION_MS = 800;
const MIN_LEVEL_DB = -10;
const MAX_LEVEL_DB = 80;

export type HearingTestPhase = 'idle' | 'playing' | 'waiting_response';

interface EngineState {
  ctx: Ctx | null;
  oscillator: OscillatorNode | null;
  gainNode: GainNode | null;
  currentFreqIndex: number;
  currentLevelDb: number;
  lastResponseWasHear: boolean | null;
  reversalCount: number;
  reversalLevels: number[];
  phase: HearingTestPhase;
  result: Audiogram;
}

const state: EngineState = {
  ctx: null,
  oscillator: null,
  gainNode: null,
  currentFreqIndex: -1,
  currentLevelDb: START_LEVEL_DB,
  lastResponseWasHear: null,
  reversalCount: 0,
  reversalLevels: [],
  phase: 'idle',
  result: createEmptyAudiogram(),
};

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * 初始化音频上下文（用于播放纯音）。无原生 API 时返回 false。
 */
export async function initHearingTestContext(): Promise<boolean> {
  if (!AudioContextClass) return false;
  if (state.ctx) return true;
  try {
    const ctx = new AudioContextClass({ sampleRate: 44100 });
    await (ctx as Ctx & { resume?: () => Promise<boolean> }).resume?.().catch(() => false);
    state.ctx = ctx as Ctx;
    return true;
  } catch {
    return false;
  }
}

/**
 * 释放音频资源
 */
export async function disposeHearingTestContext(): Promise<void> {
  stopTone();
  if (state.ctx) {
    try {
      await state.ctx.close();
    } catch { /* no-op */ }
    state.ctx = null;
  }
}

/**
 * 开始测试某一频率（索引 0..5）。返回是否成功开始。
 */
export function startFrequency(freqIndex: number): boolean {
  if (freqIndex < 0 || freqIndex >= AUDIOGRAM_FREQUENCIES.length || !state.ctx) return false;
  state.currentFreqIndex = freqIndex;
  state.currentLevelDb = START_LEVEL_DB;
  state.lastResponseWasHear = null;
  state.reversalCount = 0;
  state.reversalLevels = [];
  return true;
}

/**
 * 播放当前频率、当前电平的纯音，持续 TONE_DURATION_MS
 */
export function playTone(): void {
  if (!state.ctx || state.currentFreqIndex < 0) return;
  stopTone();

  const freq = AUDIOGRAM_FREQUENCIES[state.currentFreqIndex];
  const osc = state.ctx.createOscillator() as OscillatorNode;
  const gain = state.ctx.createGain() as GainNode;

  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.value = dbToLinear(state.currentLevelDb);
  osc.connect(gain as unknown as import('react-native-audio-api').AudioNode);
  gain.connect(state.ctx.destination as unknown as import('react-native-audio-api').AudioNode);

  state.oscillator = osc;
  state.gainNode = gain;
  state.phase = 'playing';

  try {
    osc.start(0);
  } catch { /* no-op */ }

  setTimeout(() => {
    stopTone();
    state.phase = 'waiting_response';
  }, TONE_DURATION_MS);
}

/**
 * 停止当前纯音
 */
export function stopTone(): void {
  if (state.oscillator) {
    try {
      state.oscillator.stop(0);
    } catch { /* no-op */ }
    state.oscillator = null;
  }
  state.gainNode = null;
  if (state.phase === 'playing') state.phase = 'waiting_response';
}

/**
 * 用户反馈：听到了 → 降 10 dB；听不到 → 升 5 dB。达到 2–3 次转折后取平均作为该频率阈值。
 */
export function respond(heard: boolean): void {
  if (state.currentFreqIndex < 0 || state.phase !== 'waiting_response') return;

  const wasReversal = state.lastResponseWasHear !== null && state.lastResponseWasHear !== heard;
  if (wasReversal) {
    state.reversalCount++;
    state.reversalLevels.push(state.currentLevelDb);
  }
  state.lastResponseWasHear = heard;

  const freq = AUDIOGRAM_FREQUENCIES[state.currentFreqIndex];
  const done =
    state.reversalCount >= 2 &&
    state.reversalLevels.length >= 2;

  if (done) {
    const threshold =
      state.reversalLevels.slice(-2).reduce((a, b) => a + b, 0) / Math.min(2, state.reversalLevels.length);
    (state.result as Record<number, number>)[freq] = Math.round(threshold * 10) / 10;
    state.currentFreqIndex = -1;
    state.phase = 'idle';
    return;
  }

  if (heard) {
    state.currentLevelDb = Math.max(MIN_LEVEL_DB, state.currentLevelDb - STEP_DOWN_DB);
  } else {
    state.currentLevelDb = Math.min(MAX_LEVEL_DB, state.currentLevelDb + STEP_UP_DB);
  }
}

/**
 * 获取当前状态（供 UI）
 */
export function getHearingTestState(): {
  phase: HearingTestPhase;
  currentFreqIndex: number;
  currentFreq: AudiogramFrequency | null;
  currentLevelDb: number;
  reversalCount: number;
  result: Audiogram;
} {
  const freq =
    state.currentFreqIndex >= 0 && state.currentFreqIndex < AUDIOGRAM_FREQUENCIES.length
      ? AUDIOGRAM_FREQUENCIES[state.currentFreqIndex]
      : null;
  return {
    phase: state.phase,
    currentFreqIndex: state.currentFreqIndex,
    currentFreq: freq,
    currentLevelDb: state.currentLevelDb,
    reversalCount: state.reversalCount,
    result: { ...state.result },
  };
}

/**
 * 是否支持测听（有 AudioContext）
 */
export function isHearingTestAvailable(): boolean {
  return !!AudioContextClass;
}

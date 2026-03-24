#!/usr/bin/env node
/**
 * 音频回归测试：带环境音 → 去环境音留人声
 * 读取 manifest.json，对每条用例加载 noisy/clean，运行离线 DSP 后与 clean 对比评分。
 * 每次更新核心算法后运行并对比 reports/ 下报告。
 *
 * 用法：从项目根执行 node scripts/audio-regression/run.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import wavefile from 'wavefile';
const WaveFile = wavefile.WaveFile || wavefile.default?.WaveFile || wavefile;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const REGRESSION_DIR = path.join(ROOT, 'test-data', 'audio-regression');
const SAMPLES_DIR = path.join(REGRESSION_DIR, 'samples');
const REPORTS_DIR = path.join(REGRESSION_DIR, 'reports');
const OUTPUTS_DIR = path.join(REGRESSION_DIR, 'outputs');
const RNNOISE_SR = 48000;

function loadWav(filePath) {
  const buf = fs.readFileSync(filePath);
  const wav = new WaveFile(buf);
  wav.toBitDepth('32f');
  const samples = wav.getSamples();
  const ch = Array.isArray(samples) ? samples[0] : samples;
  const sampleRate = wav.fmt.sampleRate || SR;
  return { samples: Float32Array.from(ch), sampleRate };
}

/** 可选 GTCRN：默认启用 */
function getGtcrnProcessor() {
  try {
    const scriptPath = path.join(ROOT, 'apply_gtcrn.py');
    if (!fs.existsSync(scriptPath)) return null;
    return (inputPath, outputPath) => {
      execSync(`python3 ${scriptPath} "${inputPath}" "${outputPath}"`, { stdio: 'inherit' });
    };
  } catch {
    return null;
  }
}

/** 可选 RNNoise：需安装 rnnoise-nodejs 且 USE_RNNOISE=1 时启用；suppress 使用 16bit 48kHz 单声道 RAW */
function getRnnoiseSuppress() {
  if (process.env.USE_RNNOISE !== '1') return null;
  try {
    const rnnoise = require('rnnoise-nodejs');
    return typeof rnnoise?.suppress === 'function' ? rnnoise.suppress.bind(rnnoise) : null;
  } catch {
    return null;
  }
}

// 与 AUDIO_CONFIG 对齐（离线回归用）
const SR = 44100;
const GATE_FRAME_LEN = 512;
const GATE_UPDATE_MS = 25;
const GATE_ATTACK_MS = 20;
const GATE_RELEASE_MS = 120;
const THRESHOLD_BASE = 0.002;
const THRESHOLD_SCALE = 0.04;
const NOISE_GATE = 1;
const MAIN_GAIN_DB = 12;
const MAIN_GAIN_LINEAR = Math.pow(10, MAIN_GAIN_DB / 20);
const VOICE_HP_HZ = 180;
const VOICE_LP_HZ = 4200;

// EQ_BANDS 与 src/config/audio.ts 一致
const EQ_BANDS = [
  { type: 'lowshelf', frequency: 100, gain: -8, q: 1.0 },
  { type: 'peaking', frequency: 250, gain: 3, q: 1.0 },
  { type: 'peaking', frequency: 1000, gain: 6, q: 0.8 },
  { type: 'peaking', frequency: 2500, gain: 5, q: 1.0 },
  { type: 'peaking', frequency: 4000, gain: 3, q: 1.2 },
  { type: 'highshelf', frequency: 8000, gain: -6, q: 1.0 },
];

function saveWav(samples, sampleRate, filePath) {
  const wav = new WaveFile();
  wav.fromScratch(1, sampleRate, '32f', Array.from(samples));
  fs.writeFileSync(filePath, wav.toBuffer());
}

function checkForHowling(filePath) {
  try {
    const cmd = `python3 detect_howling.py "${filePath}"`;
    const out = execSync(cmd, { encoding: 'utf8' });
    if (out.includes('HOWLING DETECTED')) {
      return { hasHowling: true, detail: out.trim() };
    }
    return { hasHowling: false, detail: out.trim() };
  } catch (err) {
    // 如果检测脚本返回非0（啸叫或异常），从 stdout/stderr 提取信息
    const message = (err.stdout || '') + (err.stderr || '');
    const hasHowling = message.includes('HOWLING DETECTED');
    return { hasHowling, detail: message.trim() };
  }
}

/** 简单线性重采样 */
function resample(samples, fromSr, toSr) {
  if (fromSr === toSr) return samples;
  const outLen = Math.round(samples.length * toSr / fromSr);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcIdx = (i * fromSr) / toSr;
    const j = Math.floor(srcIdx);
    const frac = srcIdx - j;
    out[i] = (samples[j] ?? 0) * (1 - frac) + (samples[j + 1] ?? 0) * frac;
  }
  return out;
}

/** 可选 RNNoise 离线：48k 16bit RAW → suppress → 再重采样回原 SR；无 rnnoise-nodejs 时返回 null */
function applyRNNoiseOffline(samples, sampleRate) {
  const suppress = getRnnoiseSuppress();
  if (!suppress) return null;
  const os = require('os');
  const tmpDir = os.tmpdir();
  const id = `rnnoise_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const rawIn = path.join(tmpDir, `${id}.raw`);
  const rawOut = path.join(tmpDir, `${id}_out.raw`);
  try {
    const at48k = resample(samples, sampleRate, RNNOISE_SR);
    const buf16 = Buffer.alloc(at48k.length * 2);
    for (let i = 0; i < at48k.length; i++) {
      const s = Math.max(-1, Math.min(1, at48k[i]));
      buf16.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7FFF, i * 2);
    }
    fs.writeFileSync(rawIn, buf16);
    suppress(rawIn, rawOut);
    const outBuf = fs.readFileSync(rawOut);
    const outLen = Math.floor(outBuf.length / 2);
    const out48k = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      out48k[i] = outBuf.readInt16LE(i * 2) / 0x8000;
    }
    const back = resample(out48k, RNNOISE_SR, sampleRate);
    return back.length <= samples.length ? back : back.subarray(0, samples.length);
  } catch (e) {
    console.warn('[audio-regression] RNNoise failed:', e.message);
    return null;
  } finally {
    try { fs.unlinkSync(rawIn); } catch { }
    try { fs.unlinkSync(rawOut); } catch { }
  }
}

function rms(samples, start, length) {
  let sum = 0;
  const end = Math.min(start + length, samples.length);
  for (let i = start; i < end; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / (end - start)) || 0;
}

// ─── Biquad（Audio EQ Cookbook）────────────────────────────────────────────────
function biquadCoeffs(type, f0, gainDb, Q, sampleRate) {
  const w0 = 2 * Math.PI * f0 / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const A = type === 'peaking' || type === 'lowshelf' || type === 'highshelf'
    ? Math.pow(10, gainDb / 40) : 1;
  const alpha = sinW0 / (2 * Q);

  let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;
  if (type === 'peaking') {
    b0 = 1 + alpha * A;
    b1 = -2 * cosW0;
    b2 = 1 - alpha * A;
    a0 = 1 + alpha / A;
    a1 = -2 * cosW0;
    a2 = 1 - alpha / A;
  } else if (type === 'lowshelf') {
    const sqrtA2 = 2 * Math.sqrt(A) * alpha;
    b0 = A * ((A + 1) - (A - 1) * cosW0 + sqrtA2);
    b1 = 2 * A * ((A - 1) - (A + 1) * cosW0);
    b2 = A * ((A + 1) - (A - 1) * cosW0 - sqrtA2);
    a0 = (A + 1) + (A - 1) * cosW0 + sqrtA2;
    a1 = -2 * ((A - 1) + (A + 1) * cosW0);
    a2 = (A + 1) + (A - 1) * cosW0 - sqrtA2;
  } else if (type === 'highshelf') {
    const sqrtA2 = 2 * Math.sqrt(A) * alpha;
    b0 = A * ((A + 1) + (A - 1) * cosW0 + sqrtA2);
    b1 = -2 * A * ((A - 1) + (A + 1) * cosW0);
    b2 = A * ((A + 1) + (A - 1) * cosW0 - sqrtA2);
    a0 = (A + 1) - (A - 1) * cosW0 + sqrtA2;
    a1 = 2 * ((A - 1) - (A + 1) * cosW0);
    a2 = (A + 1) - (A - 1) * cosW0 - sqrtA2;
  } else if (type === 'highpass') {
    b0 = (1 + cosW0) / 2;
    b1 = -(1 + cosW0);
    b2 = (1 + cosW0) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cosW0;
    a2 = 1 - alpha;
  } else if (type === 'lowpass') {
    b0 = (1 - cosW0) / 2;
    b1 = 1 - cosW0;
    b2 = (1 - cosW0) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cosW0;
    a2 = 1 - alpha;
  }
  return { b0, b1, b2, a0, a1, a2 };
}

function processBiquad(samples, coeffs) {
  const { b0, b1, b2, a0, a1, a2 } = coeffs;
  const out = new Float32Array(samples.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x0 = samples[i];
    const y0 = (b0 / a0) * x0 + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2;
    out[i] = y0;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
  }
  return out;
}

/** 多段 EQ 链 */
function applyEq(samples, sampleRate) {
  let buf = samples;
  for (const band of EQ_BANDS) {
    const coeffs = biquadCoeffs(band.type, band.frequency, band.gain, band.q, sampleRate);
    buf = processBiquad(buf, coeffs);
  }
  return buf;
}

/** 人声带通（仅用于门控检测）：180–4200 Hz */
function voiceBandForGate(samples, sampleRate) {
  let buf = processBiquad(samples, biquadCoeffs('highpass', VOICE_HP_HZ, 0, 0.707, sampleRate));
  buf = processBiquad(buf, biquadCoeffs('lowpass', VOICE_LP_HZ, 0, 0.707, sampleRate));
  return buf;
}

/** 平滑门控：人声带能量 + attack/release 指数平滑 */
function processOfflineImproved(inputSamples, sampleRate = SR) {
  const threshold = THRESHOLD_BASE + NOISE_GATE * THRESHOLD_SCALE;
  const attackFrames = Math.max(1, (GATE_ATTACK_MS / 1000) * sampleRate / GATE_FRAME_LEN);
  const releaseFrames = Math.max(1, (GATE_RELEASE_MS / 1000) * sampleRate / GATE_FRAME_LEN);

  const voiceBand = voiceBandForGate(inputSamples, sampleRate);
  const eqSamples = applyEq(inputSamples, sampleRate);

  const numFrames = Math.ceil(inputSamples.length / GATE_FRAME_LEN);
  const frameRms = new Float32Array(numFrames);
  for (let f = 0; f < numFrames; f++) {
    frameRms[f] = rms(voiceBand, f * GATE_FRAME_LEN, GATE_FRAME_LEN);
  }

  let gain = 0;
  const frameGain = new Float32Array(numFrames);
  for (let f = 0; f < numFrames; f++) {
    const target = frameRms[f] > threshold ? MAIN_GAIN_LINEAR : 0;
    const tc = target > gain ? attackFrames : releaseFrames;
    const alpha = 1 - Math.exp(-1 / Math.max(1, tc));
    gain = gain + alpha * (target - gain);
    frameGain[f] = gain;
  }

  const out = new Float32Array(inputSamples.length);
  for (let i = 0; i < inputSamples.length; i++) {
    const f = Math.min(Math.floor(i / GATE_FRAME_LEN), numFrames - 1);
    out[i] = eqSamples[i] * frameGain[f];
  }
  return out;
}

/** 兼容旧版：简单门控（保留供对比） */
function processOfflineGateGain(inputSamples) {
  const threshold = THRESHOLD_BASE + NOISE_GATE * THRESHOLD_SCALE;
  const out = new Float32Array(inputSamples.length);
  for (let i = 0; i < inputSamples.length; i += GATE_FRAME_LEN) {
    const frameRms = rms(inputSamples, i, GATE_FRAME_LEN);
    const g = frameRms > threshold ? MAIN_GAIN_LINEAR : 0;
    for (let j = 0; j < GATE_FRAME_LEN && i + j < inputSamples.length; j++) {
      out[i + j] = inputSamples[i + j] * g;
    }
  }
  return out;
}

/** 与参考的相关系数（-1..1），越高越接近参考 */
function correlation(a, b) {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;
  for (let i = 0; i < len; i++) {
    sumA += a[i]; sumB += b[i];
    sumAB += a[i] * b[i];
    sumA2 += a[i] * a[i]; sumB2 += b[i] * b[i];
  }
  const n = len;
  const num = n * sumAB - sumA * sumB;
  const den = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
  return den === 0 ? 0 : num / den;
}

/** 分段 SNR（dB）：signal 为算法输出，reference 为 clean */
function segmentalSnrDb(signal, reference, segmentLen = 1024) {
  const len = Math.min(signal.length, reference.length);
  let sumSnr = 0;
  let count = 0;
  for (let i = 0; i + segmentLen <= len; i += segmentLen) {
    let sigPower = 0, refPower = 0;
    for (let j = 0; j < segmentLen; j++) {
      sigPower += signal[i + j] * signal[i + j];
      refPower += reference[i + j] * reference[i + j];
    }
    if (refPower > 1e-12) {
      const snr = 10 * Math.log10((sigPower + 1e-12) / (refPower + 1e-12));
      sumSnr += snr;
      count++;
    }
  }
  return count === 0 ? 0 : sumSnr / count;
}

function main() {
  const manifestPath = path.join(REGRESSION_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('manifest.json 不存在:', manifestPath);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  if (!fs.existsSync(SAMPLES_DIR)) {
    fs.mkdirSync(SAMPLES_DIR, { recursive: true });
    fs.mkdirSync(path.join(SAMPLES_DIR, 'noisy'), { recursive: true });
    fs.mkdirSync(path.join(SAMPLES_DIR, 'clean'), { recursive: true });
  }
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  if (!fs.existsSync(OUTPUTS_DIR)) fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

  const results = [];
  let skipped = 0;
  for (const entry of manifest) {
    const noisyPath = path.join(SAMPLES_DIR, entry.noisy);
    const cleanPath = path.join(SAMPLES_DIR, entry.clean);
    console.log(`Checking ${entry.id}: ${noisyPath} exists: ${fs.existsSync(noisyPath)}, ${cleanPath} exists: ${fs.existsSync(cleanPath)}`);
    if (!fs.existsSync(noisyPath) || !fs.existsSync(cleanPath)) {
      results.push({ id: entry.id, status: 'skipped', reason: 'missing_file' });
      skipped++;
      continue;
    }
    try {
      console.log(`Processing ${entry.id}`);
      const { samples: noisy, sampleRate } = loadWav(noisyPath);
      const { samples: clean } = loadWav(cleanPath);
      const processed = processOfflineImproved(noisy, sampleRate);
      // Save processed output
      const outputPath = path.join(OUTPUTS_DIR, `${entry.id}_processed.wav`);
      saveWav(processed, sampleRate, outputPath);
      console.log(`Saved processed output: ${outputPath}`);
      const corrInput = correlation(noisy, clean);
      const corrOutput = correlation(processed, clean);
      const snrInput = segmentalSnrDb(noisy, clean);
      const snrOutput = segmentalSnrDb(processed, clean);
      const howlingResult = checkForHowling(outputPath);
      const row = {
        id: entry.id,
        status: howlingResult.hasHowling ? 'fail_howling' : 'ok',
        scene: entry.scene,
        correlation_input: Math.round(corrInput * 1e4) / 1e4,
        correlation_output: Math.round(corrOutput * 1e4) / 1e4,
        seg_snr_input_db: Math.round(snrInput * 100) / 100,
        seg_snr_output_db: Math.round(snrOutput * 100) / 100,
        snr_improvement_db: Math.round((snrOutput - snrInput) * 100) / 100,
        howling_check: howlingResult,
      };
      const rnnoiseFirst = applyRNNoiseOffline(noisy, sampleRate);
      if (rnnoiseFirst) {
        const processedRnnoise = processOfflineImproved(rnnoiseFirst, sampleRate);
        row.correlation_output_rnnoise = Math.round(correlation(processedRnnoise, clean) * 1e4) / 1e4;
        row.snr_improvement_db_rnnoise = Math.round((segmentalSnrDb(processedRnnoise, clean) - snrInput) * 100) / 100;
      }

      // GTCRN processing
      const gtcrnProcessor = getGtcrnProcessor();
      if (gtcrnProcessor) {
        try {
          console.log(`[GTCRN] Processing ${entry.id}`);
          const gtcrnOutputPath = path.join(OUTPUTS_DIR, `${entry.id}_gtcrn.wav`);
          gtcrnProcessor(outputPath, gtcrnOutputPath);
          console.log(`[GTCRN] Saved ${gtcrnOutputPath}`);
          const { samples: gtcrnProcessed } = loadWav(gtcrnOutputPath);
          const corrGtcrn = correlation(gtcrnProcessed, clean);
          const snrGtcrn = segmentalSnrDb(gtcrnProcessed, clean);
          row.correlation_output_gtcrn = Math.round(corrGtcrn * 1e4) / 1e4;
          row.snr_improvement_db_gtcrn = Math.round((snrGtcrn - snrInput) * 100) / 100;
          console.log(`[GTCRN] ${entry.id} correlation: ${row.correlation_output_gtcrn}, SNR: ${row.snr_improvement_db_gtcrn}`);
        } catch (e) {
          console.warn(`[audio-regression] GTCRN failed for ${entry.id}:`, e.message);
        }
      }
      results.push(row);
    } catch (e) {
      console.error(`[audio-regression] entry ${entry.id} error:`, e);
      results.push({ id: entry.id, status: 'error', reason: e.message || String(e) });
      skipped++;
    }
  }

  const okResults = results.filter(r => r.status === 'ok');
  const allResults = results.filter(r => r.correlation_output != null);
  const avgCorrOut = allResults.length ? allResults.reduce((s, r) => s + r.correlation_output, 0) / allResults.length : 0;
  const avgSnrImprove = allResults.length ? allResults.reduce((s, r) => s + r.snr_improvement_db, 0) / allResults.length : 0;
  const rnnoiseResults = okResults.filter(r => r.correlation_output_rnnoise != null);
  const avgCorrOutRnnoise = rnnoiseResults.length
    ? rnnoiseResults.reduce((s, r) => s + r.correlation_output_rnnoise, 0) / rnnoiseResults.length : null;
  const avgSnrImproveRnnoise = rnnoiseResults.length
    ? rnnoiseResults.reduce((s, r) => s + r.snr_improvement_db_rnnoise, 0) / rnnoiseResults.length : null;

  const gtcrnResults = allResults.filter(r => r.correlation_output_gtcrn != null);
  const avgCorrOutGtcrn = gtcrnResults.length
    ? gtcrnResults.reduce((s, r) => s + r.correlation_output_gtcrn, 0) / gtcrnResults.length : null;
  const avgSnrImproveGtcrn = gtcrnResults.length
    ? gtcrnResults.reduce((s, r) => s + r.snr_improvement_db_gtcrn, 0) / gtcrnResults.length : null;

  const report = {
    timestamp: new Date().toISOString(),
    manifest_total: manifest.length,
    run_total: results.length,
    skipped,
    passed: okResults.length,
    summary: {
      avg_correlation_output: Math.round(avgCorrOut * 1e4) / 1e4,
      avg_snr_improvement_db: Math.round(avgSnrImprove * 100) / 100,
      ...(avgCorrOutRnnoise != null && {
        avg_correlation_output_rnnoise: Math.round(avgCorrOutRnnoise * 1e4) / 1e4,
        avg_snr_improvement_db_rnnoise: Math.round(avgSnrImproveRnnoise * 100) / 100,
      }),
      ...(avgCorrOutGtcrn != null && {
        avg_correlation_output_gtcrn: Math.round(avgCorrOutGtcrn * 1e4) / 1e4,
        avg_snr_improvement_db_gtcrn: Math.round(avgSnrImproveGtcrn * 100) / 100,
      }),
    },
    results,
  };

  const reportName = `report-${report.timestamp.replace(/[:.]/g, '-').slice(0, 19)}.json`;
  const reportPath = path.join(REPORTS_DIR, reportName);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  const hasHowlingFailure = results.some(r => r.status === 'fail_howling');
  if (hasHowlingFailure) {
    const fails = results.filter(r => r.status === 'fail_howling').map(r => `${r.id}:${r.howling_check.detail.replace(/\s+/g, ' ')}`);
    console.error('[audio-regression] WARNING: howling detected in processed outputs:', fails.join(' | '));
  }

  console.log('[audio-regression] total:', manifest.length, '| ran:', okResults.length, '| skipped:', skipped);
  console.log('[audio-regression] avg_correlation_output:', report.summary.avg_correlation_output);
  console.log('[audio-regression] avg_snr_improvement_db:', report.summary.avg_snr_improvement_db);
  if (report.summary.avg_correlation_output_rnnoise != null) {
    console.log('[audio-regression] avg_correlation_output_rnnoise:', report.summary.avg_correlation_output_rnnoise);
    console.log('[audio-regression] avg_snr_improvement_db_rnnoise:', report.summary.avg_snr_improvement_db_rnnoise);
  }
  console.log('[audio-regression] report:', reportPath);

  if (hasHowlingFailure) {
    console.error('[audio-regression] FAILED: 绝对不允许出现啸音，检测到处理后啸叫。');
    process.exit(1);
  }
}

main();

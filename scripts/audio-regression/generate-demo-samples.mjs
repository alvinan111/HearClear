#!/usr/bin/env node
/**
 * 生成少量演示用 WAV：人声段（正弦）+ 环境音（噪声），用于跑通回归测试。
 * 从项目根执行：node scripts/audio-regression/generate-demo-samples.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import wavefile from 'wavefile';
const WaveFile = wavefile.WaveFile || wavefile.default?.WaveFile || wavefile;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SAMPLES_DIR = path.join(ROOT, 'test-data', 'audio-regression', 'samples');
const SR = 44100;
const DURATION_SEC = 2;

function writeWav(filePath, samplesFloat32) {
  const wav = new WaveFile();
  wav.fromScratch(1, SR, '32f', samplesFloat32);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, wav.toBuffer());
}

function tone(hz, sec, sr = SR) {
  const n = Math.floor(sr * sec);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = 0.3 * Math.sin(2 * Math.PI * hz * i / sr);
  return out;
}

function whiteNoise(n, level) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = level * (2 * Math.random() - 1);
  return out;
}

// 人声段 400Hz + 2kHz 简单双频，前后静音
function voiceOnly(sec = DURATION_SEC) {
  const n = Math.floor(SR * sec);
  const out = new Float32Array(n);
  const start = Math.floor(SR * 0.3);
  const end = Math.floor(SR * 1.5);
  for (let i = start; i < end; i++) {
    const t = (i - start) / SR;
    out[i] = 0.25 * (Math.sin(2 * Math.PI * 400 * t) + 0.5 * Math.sin(2 * Math.PI * 2000 * t));
  }
  return out;
}

// 带环境音：人声 + 白噪
function noisy(sec = DURATION_SEC, noiseLevel = 0.15) {
  const v = voiceOnly(sec);
  const n = whiteNoise(v.length, noiseLevel);
  for (let i = 0; i < v.length; i++) v[i] += n[i];
  return v;
}

const count = 5;
for (let i = 1; i <= count; i++) {
  const id = String(i).padStart(3, '0');
  const clean = voiceOnly();
  const nois = noisy();
  writeWav(path.join(SAMPLES_DIR, 'clean', id + '.wav'), clean);
  writeWav(path.join(SAMPLES_DIR, 'noisy', id + '.wav'), nois);
}
console.log('[generate-demo-samples] wrote', count, 'pairs to', SAMPLES_DIR);

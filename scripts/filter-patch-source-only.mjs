#!/usr/bin/env node
/**
 * 从 react-native-audio-api 的 patch 中只保留源码改动，去掉 .cxx、.so、.a、.orig、build 等。
 * 用法: node scripts/filter-patch-source-only.mjs < patches/react-native-audio-api+0.11.5.patch > patches/react-native-audio-api+0.11.5.patch.new
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const patchPath = join(__dirname, '..', 'patches', 'react-native-audio-api+0.11.5.patch');

const ALLOW_SUFFIXES = [
  'android/src/main/cpp/audioapi/android/AudioAPIModule.cpp',
  'android/src/main/cpp/audioapi/android/AudioAPIModule.h',
  'android/src/main/cpp/audioapi/android/core/AndroidAudioRecorder.cpp',
  'android/src/main/cpp/audioapi/android/core/AudioPlayer.cpp',
  'android/src/main/java/com/swmansion/audioapi/AudioAPIModule.kt',
  'common/cpp/audioapi/core/sources/RecorderAdapterNode.cpp',
  'common/cpp/audioapi/core/utils/SpeechEnhancementHook.cpp',
  'common/cpp/audioapi/core/utils/SpeechEnhancementHook.h',
];

const prefix = 'node_modules/react-native-audio-api/';
function allowPath(pathB) {
  if (!pathB.startsWith(prefix)) return false;
  const sub = pathB.slice(prefix.length);
  return ALLOW_SUFFIXES.some((s) => sub === s || sub.endsWith('/' + s));
}

const raw = readFileSync(patchPath, 'utf8');
const lines = raw.split(/\n/);
const out = [];
let i = 0;
while (i < lines.length) {
  const line = lines[i];
  if (!line.startsWith('diff --git ')) {
    i++;
    continue;
  }
  const m = line.match(/diff --git a\/(.+?) b\/(.+?)(?:\s|$)/);
  if (!m) {
    i++;
    continue;
  }
  const pathB = m[2];
  if (!allowPath(pathB)) {
    i++;
    while (i < lines.length && !lines[i].startsWith('diff --git ')) i++;
    continue;
  }
  while (i < lines.length) {
    out.push(lines[i]);
    i++;
    if (i < lines.length && lines[i].startsWith('diff --git ')) break;
  }
}

writeFileSync(join(__dirname, '..', 'patches', 'react-native-audio-api+0.11.5.patch'), out.join('\n') + '\n');
console.log('Filtered patch: kept', out.filter((l) => l.startsWith('diff --git')).length, 'files,', out.length, 'lines');

/**
 * Speech enhancement module: forwards setEnabled to AudioAPIModule (patched).
 * The native side registers the actual processor (no-op or sherpa-onnx GTCRN) with the audio library.
 */
import { NativeModules, Platform } from 'react-native';

const { SpeechEnhancementNative } = NativeModules;

export function setEnabled(enabled: boolean): void {
  const audio = NativeModules?.AudioAPIModule;
  if (typeof audio?.setSpeechEnhancementEnabled === 'function') {
    audio.setSpeechEnhancementEnabled(enabled);
  }
}

export function isAvailable(): boolean {
  return typeof NativeModules?.AudioAPIModule?.setSpeechEnhancementEnabled === 'function';
}

// Trigger native init (register processor) when module is first used
let nativeInitDone = false;
export function ensureNativeInit(): void {
  if (nativeInitDone || !SpeechEnhancementNative?.init) return;
  nativeInitDone = true;
  try {
    SpeechEnhancementNative.init();
  } catch {
    // no-op if init fails (e.g. audio library not patched)
  }
}

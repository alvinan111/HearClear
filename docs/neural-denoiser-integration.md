# 神经降噪接入说明（RNNoise / sherpa-onnx + GTCRN）

本文档说明如何在 HearClear 中接入**实时神经降噪**（RNNoise 或 sherpa-onnx + GTCRN），与现有 EQ/门控管线配合使用。

---

## 一、当前已实现

- **参数与 UI**：`AudioParams.neuralDenoiser`、设置页「神经降噪」开关（开/关）。
- **引擎联动**：`AudioEngine.start()` / `stop()` 时若存在原生模块 `SpeechEnhancement`，会调用 `setEnabled(params.neuralDenoiser)` / `setEnabled(false)`。
- **离线对比**：`scripts/audio-regression/run.mjs` 在安装可选依赖 `rnnoise-nodejs` 且环境变量 `USE_RNNOISE=1` 时，会跑「RNNoise → 再 DSP」管线并输出 `avg_correlation_output_rnnoise`、`avg_snr_improvement_db_rnnoise`。

---

## 二、实时路径：已接入的 Hook 与 setEnabled

当前 **react-native-audio-api** 的 patch 已包含：

1. **SpeechEnhancementHook**（C API）
   - `AudioAPISetSpeechEnhancementEnabled(int enabled)`：由 JS 通过 `AudioAPIModule.setSpeechEnhancementEnabled(boolean)` 调用。
   - `AudioAPISetSpeechEnhancementProcessor(AudioAPISpeechEnhancementProcessFn fn)`：由**独立原生模块**（如 sherpa-onnx + GTCRN）在加载时注册处理器；签名 `void (*)(float* monoOrCh0, int frames, int channels, float sampleRate)`，就地修改 ch0，多声道时 RecorderAdapterNode 会把 ch0 复制到其余声道。
2. **RecorderAdapterNode**：在 `readFrames()` 之后、`sum(adapterOutputBus_)` 之前，若 `enabled && processor` 则对 `adapterOutputBus_` 的 ch0 调用该 processor，再按需复制到其他声道。
3. **AudioAPIModule**（Android / iOS）：新增 `setSpeechEnhancementEnabled(boolean)`，供 JS 调用。

应用侧 `getSpeechEnhancementModule()` 会优先使用 `NativeModules.SpeechEnhancement`，若无则使用 `NativeModules.AudioAPIModule.setSpeechEnhancementEnabled`，因此**仅打开/关闭**已可用；**实际降噪**需要有人注册 processor。

### 2.1 注册 sherpa-onnx + GTCRN 处理器（可选原生模块）

要真正跑 GTCRN，需要单独做一个**原生模块**（或内联到 app 的 native 工程），在模块加载时：

1. 链接或动态加载 sherpa-onnx（C API 或 C++），并加载 GTCRN 模型（如 [sherpa-onnx 预构建](https://github.com/k2-fsa/sherpa-onnx/releases)、[GTCRN 权重](https://github.com/Xiaobin-Rong/gtcrn) 导出 ONNX）。
2. 实现符合 `AudioAPISpeechEnhancementProcessFn` 签名的函数：接收 `(float* monoOrCh0, int frames, int channels, float sampleRate)`，在**音频线程**内调用 sherpa-onnx 的 speech enhancement API 对 `monoOrCh0` 做原地处理（注意 GTCRN 通常 16kHz；若非 16k 需在模块内重采样或使用支持该采样率的接口）。
3. 在模块初始化时调用 `AudioAPISetSpeechEnhancementProcessor(your_process_fn)` 注册；进程内需能解析到 `AudioAPISetSpeechEnhancementProcessor` 符号（与 react-native-audio-api 同进程，Android 可用 `dlsym(RTLD_DEFAULT, "AudioAPISetSpeechEnhancementProcessor")`，iOS 同 target 链接即可）。

该原生模块**不必**再暴露 `setEnabled` 给 JS（开关已由 `AudioAPIModule.setSpeechEnhancementEnabled` 控制）；若希望保留 `SpeechEnhancement` 名字，可做一层 JS 转发到 `AudioAPIModule.setSpeechEnhancementEnabled`。

---

## 三、离线回归中启用 RNNoise

```bash
# 安装可选依赖（需支持 16bit 48kHz RAW 的 suppress(inputPath, outputPath)）
npm install rnnoise-nodejs

# 启用 RNNoise 管线并运行回归
USE_RNNOISE=1 npm run test:audio-regression
```

报告中会出现 `correlation_output_rnnoise`、`snr_improvement_db_rnnoise` 及汇总的 `avg_correlation_output_rnnoise`、`avg_snr_improvement_db_rnnoise`，便于与纯 DSP 管线对比。

---

## 四、参考链接

- RNNoise：<https://github.com/xiph/rnnoise>  
- GTCRN + sherpa-onnx：<https://github.com/k2-fsa/sherpa-onnx>、<https://github.com/Xiaobin-Rong/gtcrn>  
- 算法选型：`docs/speech-enhancement-algorithm-options.md`

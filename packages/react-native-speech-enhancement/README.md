# react-native-speech-enhancement

为 HearClear 提供神经降噪（sherpa-onnx + GTCRN）与 react-native-audio-api 的桥接：在原生侧注册处理器，开关由 `AudioAPIModule.setSpeechEnhancementEnabled` 控制。

## 安装

主项目已通过 `file:packages/react-native-speech-enhancement` 依赖本包。安装依赖后执行：

```bash
npx expo prebuild
```

以生成包含本模块的 Android/iOS 工程。

## 当前行为

- **Android / iOS**：在首次调用 `init()` 时，通过 `AudioAPISetSpeechEnhancementProcessor` 向 react-native-audio-api 注册一个 **no-op 处理器**（透传，不修改音频）。
- 应用内「神经降噪」开关会调用 `setSpeechEnhancementEnabled(true/false)`；当开关打开且已注册处理器时，音频管线会经过该处理器（当前为透传）。

## 接入真实 GTCRN（可选）

要使用 sherpa-onnx + GTCRN 做真实降噪，需要：

1. **Android**：将 sherpa-onnx 的预编译 `libsherpa-onnx-c-api.so` 放入 `android/src/main/jniLibs/<abi>/`，并在 C++ 中 `dlopen` 该库，使用 `SherpaOnnxCreateOfflineSpeechDenoiser` / `SherpaOnnxOfflineSpeechDenoiserRun` 实现处理器，再调用 `AudioAPISetSpeechEnhancementProcessor` 注册。
2. **iOS**：链接 sherpa-onnx 的 C API 或通过动态库加载，同样创建 OfflineSpeechDenoiser，在处理器回调中跑 `SherpaOnnxOfflineSpeechDenoiserRun` 并将结果写回 buffer。
3. **模型**：GTCRN 的 ONNX 模型可从 [k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) 或 [Xiaobin-Rong/gtcrn](https://github.com/Xiaobin-Rong/gtcrn) 获取，需在运行时提供模型路径（如 assets 解压或下载到 filesDir）。

详见主项目 `docs/neural-denoiser-integration.md`。

# 降噪与人声识别技术调研（GitHub / 技术社区）

本文档基于 GitHub 与技术社区检索，汇总**可落地**的降噪、人声识别（VAD）、语音增强方案，在**延迟与效果**之间做平衡；不局限现有架构，必要时可完全重构，以最终听感为准。

---

## 一、方案总览

| 方案 | 类型 | 延迟/帧长 | 效果 | 移动端 | 许可 | 推荐场景 |
|------|------|-----------|------|--------|------|----------|
| **RNNoise** | 降噪（DSP+RNN） | ~10ms/帧，480 样本@48kHz | 成熟、WebRTC 在用 | C 库，Android AOSP 有，需自集成 iOS | BSD-3 | 首选：低延迟、稳定、无模型文件 |
| **Silero VAD** | 人声检测 | 32ms 块（512@16kHz） | 高准确率 | ONNX，sherpa-onnx 有现成 | MIT | 替代能量门，驱动门控或增益 |
| **sherpa-onnx** | VAD + 语音增强 | 依模型（GTCRN 等） | VAD+增强一站式 | Android/iOS 官方支持 | Apache-2.0 | 全原生管线：采集→增强→播放 |
| **FastEnhancer** | 神经语音增强 | RTF 0.012–0.022（单线程） | SOTA 级，流式 | ONNX 导出，需自集成移动端 | 见仓库 | 效果优先、可接受 16kHz |
| **GTCRN (sherpa)** | 语音增强 | 16kHz，离线/流式 | 较好，模型 ~523KB | sherpa-onnx 支持 | 见模型 | 与 Silero VAD 同栈，易集成 |

---

## 二、RNNoise（降噪，优先考虑）

- **仓库**：[xiph/rnnoise](https://github.com/xiph/rnnoise)（5.3k+ star，BSD-3-Clause）
- **论文**：A Hybrid DSP/Deep Learning Approach to Real-Time Full-Band Speech Enhancement (MMSP 2018, arXiv:1709.08243)
- **特点**：纯 C、无第三方运行时；48kHz 单声道；**帧长 480 样本（10ms）**，算法延迟约 10ms；WebRTC/Chromium 内置，Android 在 AOSP 的 `platform/external/rnnoise`。
- **集成**：
  - Android：C 库 + JNI 封装，或参考 [henkelmax/rnnoise4j](https://github.com/henkelmax/rnnoise4j)（Java 通过 JNI 调 RNNoise）。
  - iOS：源码编进工程或静态库，在音频回调里对 480 样本/帧调用 `rnnoise_process_frame()`。
  - 若当前管线是 44.1kHz，需重采样到 48kHz 再进 RNNoise，或查社区是否有人做 44.1kHz 分支。
- **模型**：默认模型随库下载（`download_model.sh`）；也支持从文件加载（`rnnoise_model_from_file()`），便于换小模型。
- **与现有架构**：可在「麦克风→RNNoise→人声带通/EQ→门控→增益→输出」中替代或补在现有 DSP 前，**全段放在原生音频线程**，延迟可控。

---

## 三、Silero VAD（人声检测）

- **仓库**：[snakers4/silero-vad](https://github.com/snakers4/silero-vad)（Wiki 含 ONNX 与依赖）
- **模型**：v4/v5，16kHz/8kHz；量化版可小至约 208KB（16kHz）；支持 ONNX opset 15/16。
- **块长**：32ms（512 样本@16kHz 或 256@8kHz）；需按序处理以保持状态。
- **移动端**：
  - **sherpa-onnx** 已集成 Silero VAD，提供 Android/iOS 示例（VAD、VAD+ASR 等），C++/Kotlin/Swift。
  - 若仅要 VAD：用 ONNX Runtime 移动版加载 Silero，在 16kHz 或 8kHz 上每 32ms 跑一帧，结果回传 RN 或直接驱动原生门控。
- **用途**：替代或辅助当前「人声频段能量门」；VAD=1 时开门或提高增益，VAD=0 时关门或压低，减少背景乐/空调误触发。

---

## 四、sherpa-onnx（VAD + 语音增强一站式）

- **仓库**：[k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)（活跃维护，多语言 API）
- **文档**：[Speech enhancement](https://k2-fsa.github.io/sherpa/onnx/speech-enhancement/index.html)、[VAD](https://k2-fsa.github.io/sherpa/onnx/vad/index.html)
- **能力**：VAD（Silero/ten-vad）+ 语音增强（如 GTCRN）+ ASR/TTS 等；**全部本地、无联网**。
- **平台**：Android / iOS 官方支持，C++、Kotlin、Swift、Java 等；有预编译 APK/WASM 示例。
- **语音增强模型**：如 **gtcrn_simple.onnx**（约 523KB），16kHz；[下载与用法](https://k2-fsa.github.io/sherpa/onnx/speech-enhancement/models.html)；RTF 约 0.07 量级（文档示例）。
- **落地**：用 C++/Kotlin/Swift 在原生层做「麦克风 → VAD + 增强 → 播放」整条管线，RN 只发配置/启停；或仅用其 VAD/仅用其增强，与 RNNoise 组合。

---

## 五、FastEnhancer（流式神经增强，效果优先）

- **仓库**：[aask1357/fastenhancer](https://github.com/aask1357/fastenhancer)（论文 + 文档 + ONNX）
- **论文**：FastEnhancer: Speed-Optimized Streaming Neural Speech Enhancement (arXiv:2509.21867)
- **特点**：因果流式、单线程 CPU 上 RTF 极低；**FastEnhancer_T** 约 22K 参数、RTF 0.012（M1）/0.013（Xeon），**FastEnhancer_B** 92K、RTF 0.022/0.026；Voicebank-Demand 与 DNS-Challenge 上 SISDR/PESQ/STOI 优于 GTCRN 等。
- **采样率**：16kHz（与多数增强模型一致）。
- **部署**：提供 ONNX；移动端需自接 ONNX Runtime（Android/iOS），在音频线程或专用线程做流式推理；RN 侧仅控制开关/强度。
- **取舍**：效果最好，延迟仍低（RTF&lt;0.03），但需 16kHz 重采样与 ONNX 集成；适合「效果优先、可接受一定工程量」的重构。

---

## 六、其他参考

- **Microsoft DNS-Challenge**：[microsoft/DNS-Challenge](https://github.com/microsoft/DNS-Challenge)，评测与 DNSMOS；模型与 ONNX 需从挑战/论文跟进，偏研究评测，移动端需自接。
- **Nested U-Net 移动端**：GitHub 有 [Nested-U-Net-based-Real-time-Speech-Enhancement-Mobile-App](https://github.com/JaeBinCHA7/Nested-U-Net-based-Real-time-Speech-Enhancement-Mobile-App)，可作移动端结构参考。
- **Jitsi**：已集成 RNNoise 做增强降噪，说明生产环境可接受其延迟与效果。

---

## 七、架构建议（平衡延迟与效果）

1. **最小改动、低风险**  
   - 保持现有 RN 管线，仅把「门控」从纯能量改为 **Silero VAD 驱动**（32ms 块，原生或 RN+ONNX）；阈值/attack/release 保留。  
   - 延迟增加主要来自 32ms 块 + 推理；效果上人声/非人声区分会明显优于能量门。

2. **推荐：原生降噪 + 可选 VAD**  
   - **原生音频管线**（Android Oboe/AAudio，iOS AVAudioEngine/RemoteIO）：麦克风 → **RNNoise**（480 样本@48kHz）→ 现有或简化 EQ/门控 → 输出。  
   - 门控仍可用能量或改为 **Silero VAD**（16kHz 分支或 8kHz 以省算力）。  
   - RN 只下发配置、启停、UI；不参与实时数据路径，延迟可控在约 10–30ms 量级（含系统 buffer）。

3. **效果优先、可重构**  
   - 原生管线：麦克风 → **FastEnhancer_T/B（ONNX）**（16kHz 流式）→ 增益/EQ → 输出；或麦克风 → RNNoise → FastEnhancer（双级）。  
   - VAD 可选：Silero 驱动门控或仅做 UI 指示。  
   - 需统一 16kHz 或 48kHz 重采样策略，并做真机延迟与听感测试。

4. **一站式 sherpa-onnx**  
   - 若希望少维护多套模型，可直接用 **sherpa-onnx**：VAD（Silero）+ 增强（GTCRN）都在同一栈，Android/iOS 有现成 API；管线全在原生，RN 只调其接口。

---

## 八、延迟与采样率小结

| 技术 | 典型帧/块 | 采样率 | 算法延迟量级 |
|------|-----------|--------|--------------|
| RNNoise | 480 样本/帧 | 48 kHz | ~10 ms |
| Silero VAD | 512 样本/块 | 16 kHz | 32 ms |
| GTCRN (sherpa) | 依实现 | 16 kHz | 需实测（RTF~0.07） |
| FastEnhancer_T | 流式 | 16 kHz | RTF 0.012 → 约 2ms/帧量级（依帧长） |

当前 App 若为 44.1kHz，接入 48k（RNNoise）或 16k（VAD/增强）均需重采样；建议在原生层统一采样率与块长，避免多次转换增加延迟。

---

## 九、参考链接

- RNNoise: https://github.com/xiph/rnnoise  
- Silero VAD: https://github.com/snakers4/silero-vad  
- sherpa-onnx: https://github.com/k2-fsa/sherpa-onnx  
- sherpa-onnx 语音增强: https://k2-fsa.github.io/sherpa/onnx/speech-enhancement/index.html  
- sherpa-onnx 预训练模型: https://github.com/k2-fsa/sherpa-onnx/releases/tag/speech-enhancement-models  
- FastEnhancer: https://github.com/aask1357/fastenhancer  
- RNNoise 论文: https://arxiv.org/abs/1709.08243  

以上均为开源、可商用或研究用途；集成前请再确认各仓库最新许可与文档。

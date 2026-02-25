# 语音增强 / 降噪算法方案调研（GitHub）

本文档汇总从 GitHub 上筛选出的、适合 HearClear 的**更好算法方案**，包括轻量小模型与可落地的工程实现，便于后续选型与接入。

---

## 一、当前 HearClear 方案（对照）

- **实现**：多段 EQ + 人声带门控 + 平滑增益 + 固定 Notch（纯 DSP，无神经网络）。
- **回归指标**：`avg_correlation_output: 0.8882`，`avg_snr_improvement_db: 16.05`。
- **目标**：在保持低延迟、可实时、移动端可用的前提下，引入更好的增强/降噪以提升听感与可懂度。

---

## 二、推荐方案概览

| 方案 | 参数量/算力 | 移动端/实时 | 与 RN 集成难度 | 推荐度 |
|------|-------------|------------|----------------|--------|
| **GTCRN + sherpa-onnx** | ~48K 参数，33 MMAC/s | ✅ 支持 Android/iOS | 中（原生模块/ONNX） | ⭐⭐⭐⭐⭐ |
| **RNNoise (WASM)** | ~0.06M，极低 | ✅ 浏览器/Node | 低（需桥接或 native 封装） | ⭐⭐⭐⭐ |
| **Bose TinyLSTMs** | 压缩后适合 MCU | ✅ 2.39ms 延迟 | 高（仅论文+音频样本，无开源推理代码） | ⭐⭐⭐ |
| **Lite-RTSE** | 1.56M，0.55 G MAC/s | ✅ 实时 | 中（PyTorch→ONNX→移动端） | ⭐⭐⭐ |
| **URGENT 2024 基线** | 较大 | 需裁剪/蒸馏 | 高（数据与训练流程重） | ⭐⭐ |

---

## 三、方案详情与仓库链接

### 1. GTCRN（首选：超轻量 + 已有移动端生态）

- **仓库**：<https://github.com/Xiaobin-Rong/gtcrn>
- **论文**：ICASSP 2024 — *GTCRN: A Speech Enhancement Model Requiring Ultralow Computational Resources*
- **特点**：
  - **48.2K 参数**，**33 MMAC/s**，比 RNNoise 更轻或相当，效果明显优于 RNNoise。
  - 在 VCTK-DEMAND 上：PESQ 2.87、STOI 0.940、SISNR 18.83；DNS3 上 DNSMOS 等也优于 RNNoise。
  - 提供 **streaming 推理**（流式），CPU 上 RTF≈0.07，适合实时。
- **移动端/集成**：
  - **sherpa-onnx** 已支持 GTCRN：[k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)（含 Android/iOS、Python/Java/Swift/Kotlin 等）。
  - 有 [Hugging Face 在线 demo](https://huggingface.co/spaces/k2-fsa/wasm-speech-enhancement-gtcrn)（WASM），可先体验效果。
- **预训练**：仓库 `checkpoints/` 提供 DNS3 与 VCTK-DEMAND 预训练模型。
- **建议**：用 sherpa-onnx 的 Android/iOS 接口做原生模块，在 RN 里对「麦克风帧」或「录好的短段」调用增强，再送入现有 EQ/门控管线，或替代部分 DSP。

---

### 2. RNNoise（经典轻量、易先落地）

- **原始 C 库**：<https://github.com/xiph/rnnoise>
- **WASM/JS**：
  - [jitsi/rnnoise-wasm](https://github.com/jitsi/rnnoise-wasm)（Apache-2.0，常用）
  - [shiguredo/rnnoise-wasm](https://github.com/shiguredo/rnnoise-wasm)（SIMD 加速）
- **特点**：约 0.06M 参数，算力极低，很多实时场景验证过；效果弱于 GTCRN 但稳定。
- **集成思路**：
  - **方案 A**：在 Node/脚本里用 WASM 做离线增强（例如与现有 `scripts/audio-regression` 对比）。
  - **方案 B**：用 React Native 原生模块封装 C 库或 WASM，对实时缓冲块调用 RNNoise，再输出到现有引擎。
- **建议**：若优先「快速有一版神经网络降噪」，可先用 RNNoise 做原型；长期可换成 GTCRN 或「RNNoise + GTCRN 串联」。

---

### 3. Bose TinyLSTMs（助听器场景、MCU 级）

- **仓库**：<https://github.com/Bose/efficient-neural-speech-enhancement>
- **论文**：*TinyLSTMs: Efficient Neural Speech Enhancement for Hearing Aids*（arXiv:2005.11138）
- **特点**：针对助听器 HW， pruning + INT8 量化后 2.39ms 延迟，满足 10ms 内；11.9× 模型压缩、2.9× 运算降低，听感无统计差异。
- **局限**：仓库仅提供**音频样本**（clean/dirty/proc），**未提供推理代码或权重**，无法直接集成。
- **建议**：可作「目标规格」参考；若需使用需自行复现或联系作者/后续开源。

---

### 4. Lite-RTSE（轻量实时、RTC 场景）

- **仓库**：<https://github.com/Xiaobin-Rong/lite-rtse>
- **论文**：*Lite-RTSE: Exploring A Cost-Effective Lite DNN Model for Real-Time Speech Enhancement in RTC Scenarios*
- **特点**：1.56M 参数、0.55 G MAC/s，两阶段「masking + residual」复谱，PESQ/STOI 不错；实现与论文有细微差异（见 README）。
- **集成**：PyTorch 实现，需导出 ONNX 再在移动端用 ONNX Runtime 或 sherpa-onnx 等跑；比 GTCRN 重，适合「要稍强效果、能接受多一点算力」时考虑。

---

### 5. URGENT 2024 / 通用语音增强基线

- **挑战主页**：<https://urgent-challenge.github.io/urgent2024/>
- **数据/脚本**：<https://github.com/urgent-challenge/urgent2024_challenge>
- **特点**：NeurIPS 2024 通用语音增强（噪声+混响等），数据与基线完整，适合做**训练与评估**。
- **局限**：基线模型偏大，移动端需蒸馏/剪枝或只作离线评估用；数据准备与训练流程重。
- **建议**：若后续自研或微调模型，可把 URGENT 数据与指标当作「上游」参考；短期集成优先用 GTCRN/RNNoise。

---

### 6. 其他可关注

- **Hugging Face WASM GTCRN**：<https://huggingface.co/spaces/k2-fsa/wasm-speech-enhancement-gtcrn> — 浏览器里试效果与延迟。
- **sherpa-onnx 文档**：<https://k2-fsa.github.io/sherpa/onnx/> — 含 Android/iOS 构建与 API，便于接 RN 原生模块。
- **DeepFilterNet / PercepNet 等**：效果更好但模型更大，更适合云端或离线；若未来有「上传一段再增强」功能可考虑。

---

## 四、接入 HearClear 的推荐路线

1. **短期（先有一版神经网络降噪）**
   - **选项 A**：用 **sherpa-onnx + GTCRN** 做 Android/iOS 原生模块，对麦克风缓冲做实时增强，再进现有 EQ/门控/增益管线。
   - **选项 B**：用 **RNNoise**（C 库或 rnnoise-wasm）做原生或 Node 侧增强，与当前 DSP 并联或串联，便于 A/B 测试。

2. **中期（效果与延迟优化）**
   - 在回归脚本里对比：当前 DSP vs RNNoise vs GTCRN（离线），统一用现有 `processOffline*` 与 WAV 采样率。
   - 若 GTCRN 效果与延迟都满意，可把「默认增强」从纯 DSP 改为「GTCRN + 现有 EQ/门控」。

3. **长期（可选）**
   - 用 URGENT 等数据微调 GTCRN 或小模型，适配 HearClear 目标场景（如 TV、嘈杂环境）。
   - 参考 Bose TinyLSTMs 的延迟与功耗指标，做进一步量化/剪枝以适配低端设备。

---

## 五、参考链接汇总

| 名称 | 链接 |
|------|------|
| GTCRN 官方 | https://github.com/Xiaobin-Rong/gtcrn |
| sherpa-onnx（含 GTCRN） | https://github.com/k2-fsa/sherpa-onnx |
| GTCRN 在线 demo | https://huggingface.co/spaces/k2-fsa/wasm-speech-enhancement-gtcrn |
| RNNoise 原版 | https://github.com/xiph/rnnoise |
| jitsi rnnoise-wasm | https://github.com/jitsi/rnnoise-wasm |
| Bose TinyLSTMs | https://github.com/Bose/efficient-neural-speech-enhancement |
| Lite-RTSE | https://github.com/Xiaobin-Rong/lite-rtse |
| URGENT 2024 挑战 | https://urgent-challenge.github.io/urgent2024/ |
| URGENT 数据与脚本 | https://github.com/urgent-challenge/urgent2024_challenge |

---

*文档基于 2025 年 2 月 GitHub 与公开论文整理，集成细节以各仓库最新 README 为准。*

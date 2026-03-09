# 原生音频架构目标与演进（2026 助听器级）

本文档记录「助听器级」音频架构的核心原则、与当前实现的差距，以及分阶段演进路径。可作为后续 Native C++ / Oboe / AI 增强的开发依据。

---

## 一、架构核心：Native C++ 与线程安全

### 1.1 原则

- **音频处理逻辑必须在 Native 层（C/C++）**，运行在**最高优先级的音频线程**中。
- **跨平台一致**：无论 Android (Oboe/AAudio) 还是 iOS (Core Audio / AU)，实时路径都在原生完成。

### 1.2 音频回调中禁止的操作（避免 Audio Glitch / 爆音）

在音频回调里**不要**做：

- 申请内存（malloc / new / 任意可能触发 GC 的分配）
- Log 输出（printf / __android_log_print / NSLog）
- 线程同步（Lock / Mutex / synchronized）
- Objective-C / Java 消息传递（跨 JNI / 跨桥调用）

上述任一项都可能引入不可预测的延迟或阻塞，导致掉帧、爆音。

### 1.3 音频线程 ↔ UI/控制线程的数据交换

- 使用 **Lock-free Ring Buffer（无锁环形缓冲区）** 在音频线程与 UI 线程之间交换数据。
- 控制参数（增益、门限、开关等）通过**单写单读**的原子或 ring buffer 传递，避免在回调内加锁。

---

## 二、Android 平台：Oboe + AAudio

### 2.1 选型

- **Oboe** 为当前 Android 上**生产级**低延迟音频的事实标准。
- Android 8.1+ 上 Oboe 会使用 **AAudio**；AAudio 支持 **MMAP 模式**，可绕过系统混音器，直接与驱动交互，降低延迟。

### 2.2 推荐配置

| 配置 | 说明 |
|------|------|
| `setPerformanceMode(oboe::PerformanceMode::LowLatency)` | 强制走低延迟路径 |
| `setSharingMode(oboe::SharingMode::Exclusive)` | **独占模式**，App 独占音频流，减少其他 App 干扰并显著降低延迟 |
| `setUsage(oboe::Usage::VoiceCommunication)` | 激活系统 AEC 与基础降噪；助听场景可关闭系统降噪 `setPreprocessorEnabled(false)` 改用自有算法 |

### 2.3 2026 可选：ADPF

- **ADPF (Android Dynamic Performance Framework)**：在运行较重 AI 降噪时，通过 ADPF 向系统声明「高实时性任务」，减少因 CPU 降频导致的卡顿。
- 适用场景：端侧语音增强 / 降噪模型在后台持续推理时。

---

## 三、算法：AI 语音增强 + DSP

### 3.1 语音增强（Speech Enhancement）

- 助听器不能只做「音量放大」，否则会放大噪音。
- **端侧轻量 AI 模型**：推荐 **HANCE** 或 **LiteRT（原 TFLite）**，目标延迟 **10–20ms** 的人声提取/增强模型。

### 3.2 DSP 结合

1. **分段压缩（WDRC）**
   - 老年人听力损失多为**非线性**（高频损失多、低频损失少）。
   - 实现**多通道动态范围压缩**，根据**听力图（Audiogram）**做个性化补偿。

2. **FFT 窗口**
   - 建议 **128 或 256** 的短窗口。
   - 窗口越大 → 延迟越高；窗口越短 → 频率分辨率越差；需在**延迟与频率分辨率**之间折中。

---

## 四、当前 HearClear 实现 vs 目标架构

| 维度 | 目标架构 | 当前实现 | 差距 |
|------|----------|----------|------|
| 实时处理位置 | Native C++，音频线程 | JS/TS，react-native-audio-api 节点图 | 在 JS 主线程/渲染线程侧，存在 GC、Bridge 等不确定延迟 |
| 数据交换 | Lock-free Ring Buffer | 无；参数经 store 直传，Analyser 定时拉取 | 无专门的无锁结构，存在潜在竞态与延迟 |
| 音频回调约束 | 无分配/无锁/无 Log/无跨语言调用 | 由 react-native-audio-api 内部实现决定，不可控 | 无法保证「回调内零危险操作」 |
| Android 底层 | Oboe + AAudio，LowLatency + Exclusive | 库内为 Oboe/AAudio，但未显式配置 PerformanceMode/SharingMode | 需在原生层显式设置并验证 |
| 系统 AEC/降噪 | VoiceCommunication，可选关闭预处理 | 已通过 patch 使用 VoiceCommunication | 基本一致；可补充「关闭系统降噪」选项 |
| FFT 窗口 | 128 或 256 | 2048（门控与频谱） | 延迟与频率分辨率均与目标不符 |
| AI 语音增强 | HANCE / LiteRT，10–20ms | 无 | 未接入 |
| WDRC / 听力图 | 多通道 WDRC + Audiogram | 可选听力测试 → 处方 + EQ 频带增益；无处方时均匀放大 | 已实现简化半增益处方与 7 段 EQ 映射 |
| 反馈修正 | 用户实时调节 | 运行中「太大声/太小声/刚好」+ 低/中/高频微调，持久化到 AsyncStorage，门控循环中更新 EQ | 已实现 |
| ADPF | 可选，高负载时防降频 | 未使用 | 未使用 |

---

## 五、演进路径（建议分阶段）

### Phase A：文档与配置（当前）

- [x] 本文档与 `implementation-notes.md`、`latency-and-vad-roadmap.md` 对齐。
- [x] 在 react-native-audio-api 的 Android 原生代码（patch）中**显式设置** Oboe：`PerformanceMode::LowLatency`、`SharingMode::Exclusive`（Player + Recorder）；Player 保留 `Usage::VoiceCommunication`、`ContentType::Speech`。见 `patches/react-native-audio-api+0.11.5.patch`。

### Phase B：在现有 RN 管线内优化（短期）

- [x] **门控/分析 FFT**：门控路径 FFT 已从 2048 降为 **512**（`GATE_ANALYSER_FFT`），人声频段 bin 仍按 `VOICE_BAND_*` 与 `hzPerBin` 动态计算；UI 频谱仍用 `FFT_SIZE = 2048`。
- [ ] **Worklet（可选）**：若 react-native-audio-api + react-native-worklets 兼容，将门控或增益控制迁入 Worklet，在每块 128 样本上计算，减少主线程抖动（见 `latency-and-vad-roadmap.md` Phase 2）。
- [x] 设置中增加「延迟测试」入口（`/latency-test`），说明拍手/loopback 测量方法；端到端延迟表仍待真机测量后填写。

### Phase C：Native 音频管线（中期）

- [ ] 新增 **Native 音频模块**（C++）：  
  - Android：**Oboe** 输入/输出，**LowLatency + Exclusive**，MMAP 可用时启用。  
  - 音频回调内仅做：读输入 → 处理（无分配/无锁/无 Log）→ 写输出。  
- [ ] **Lock-free Ring Buffer**：  
  - 音频线程写处理后的 PCM（或 UI 需要的分析结果）；  
  - UI/控制线程读参数与可选的分析结果；  
  - 控制参数单写单读，经 ring buffer 或原子变量传入 Native。  
- [ ] JS 层保留「开关、预设、参数下发」与 UI；实时数据路径全部在 Native。

### Phase D：AI + WDRC（长期）

- [ ] 接入 **HANCE 或 LiteRT** 端侧人声增强模型，在 Native 管线中调用，目标 10–20ms 额外延迟。
- [ ] 实现**多通道 WDRC**，支持从**听力图（Audiogram）**导入或配置各频段增益/压缩比。
- [ ] （可选）Android 上对重负载场景启用 **ADPF**，避免 CPU 降频导致卡顿。

---

## 六、参考与相关文档

- 管线与门控：`src/services/audio/AudioEngine.ts`、`src/config/audio.ts`
- 听力测试、处方公式与反馈修正流程：`docs/hearing-test-and-prescription.md`
- 延迟测量与门控参数：`docs/latency-and-vad-roadmap.md`
- 实现约定与 Android 补丁：`docs/implementation-notes.md`
- 啸叫与反馈抑制：`docs/android-feedback-solution.md`、`docs/feedback-suppression.md`

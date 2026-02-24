# Android 啸叫与卡死 — 彻底解决方案（仅 Android 优先）

## 一、现状问题

### 1. 啸叫仍然严重
- 当前：JS 里 10ms 轮询 FFT → 找尖峰 → 调 Notch + 限幅。反应慢、且麦克风输入未做回声对消，反馈路径从源头就存在。
- react-native-audio-api 的 Android 侧若未使用 `VOICE_COMMUNICATION` 录音源，**系统级 AEC 未启用**，播放声会直接进麦，增益一大就啸叫。

### 2. 卡死原因
- **10ms setInterval** 在 JS 主线程上跑：`getFloatFrequencyData`（同步读 native） + 1024 次循环 + 多次写 BiquadFilterNode + `setFeedbackFrequency`（Zustand setState）。  
- 每 10ms 一次，JS 被占满，UI 无法响应 → 卡死、ANR。

### 3. 结论
- 在 JS 里做“高频率 FFT + 实时调 Notch”与“不卡”不可兼得。
- 要**彻底**解决啸叫，必须：**Android 用系统 AEC 从录音端消回声**，必要时再在 **native 里做轻量抑啸**，JS 只做参数和 UI。

---

## 二、方案总览（仅 Android，不考虑 iOS）

| 阶段 | 目标 | 做法 |
|------|------|------|
| **Phase 1** | 先消除卡死、减轻啸叫 | 停掉 10ms JS 反馈环；只保留输出限幅 + 少量固定/轻量处理；可适当降增益上限。 |
| **Phase 2** | 从源头减反馈 | 在 Android 录音侧使用 **VOICE_COMMUNICATION**，启用系统 AEC（需改 react-native-audio-api 或自建 native 录音）。 |
| **Phase 3**（可选） | 抑啸再加强 | 在 Android native（C++/Kotlin）里做 FFT + 限幅/Notch，不占 JS；JS 只调增益等参数。 |

---

## 三、Phase 1：立即执行（消除卡死 + 减轻啸叫）

### 3.1 停掉导致卡死的 JS 反馈环
- **删除或永久关闭** 基于 `setInterval` 的“自适应 Notch”逻辑（`startFeedbackLoop` 及对 `state.feedbackInterval` 的依赖）。
- 不再在 JS 里做：`getFloatFrequencyData`、按频点改 Biquad、按峰值改 limiter 的 10ms 轮询。

### 3.2 保留/简化为“纯限幅 + 固定处理”
- **输出限幅**：在输出前保留一个 **固定** 的 Gain 或简单压缩（例如用 Biquad 做 soft clip 或固定系数 limiter），**不在 JS 里根据 FFT 动态改**，避免主线程负载。
- **固定预防性 Notch**：可保留 1～2 个**固定**频点的轻 Notch（如 2kHz、3kHz），参数写死，不再由 JS 每 10ms 更新。
- 若仍用“动态 limiter”，则**仅**在 JS 里做：例如每 **100～150ms** 读一次输出电平，仅当超过阈值时把**一个**总增益乘数调低（例如 0.85），否则恢复 1.0；且**不要**在同样逻辑里改 Notch 频点。

### 3.3 参数上的保守化（防啸）
- 适当**降低各模式最大增益**（如 NORMAL/骨传导/外放 各降 3～6dB），使环路增益更难达到 1。
- 预防性 Notch 的衰减可略加强（如 -2dB～-2.5dB），仍保持固定、不随 FFT 变化。

### 3.4 预期效果
- **卡死/ANR**：应消失（不再有 10ms 重 FFT + 多节点更新）。
- **啸叫**：会减轻但可能未“彻底”；为彻底解决需做 Phase 2（及可选 Phase 3）。

---

## 四、Phase 2：Android 录音使用 AEC（彻底减反馈）

### 4.1 原理
- 使用 `MediaRecorder.AudioSource.VOICE_COMMUNICATION`（或等效）作为录音源，系统会将**扬声器/听筒的参考信号**与麦克风信号做回声对消，再交给应用。
- 这样“播放 → 麦”的路径在**进入我们处理链之前**就被削弱，啸叫会从根上减轻。

### 4.2 实现方式（二选一）

**方式 A：改 react-native-audio-api 的 Android 端**
- 在其 Android  native 代码里找到创建 `AudioRecord` / 配置录音源的地方。
- 将录音源改为 `VOICE_COMMUNICATION`（并保证与当前采样率/通道等兼容）。
- 若库不支持“录音源”配置，可 fork 该库，在 Android 上强制使用 `VOICE_COMMUNICATION`，并打 patch 或发 PR。

**方式 B：自建 Android Native 录音模块**
- 写一个 Android 原生模块（Kotlin/Java）：
  - 用 `AudioRecord(VOICE_COMMUNICATION, ...)` 读取 PCM。
  - 通过 JSI 或 EventEmitter 把 PCM 块传给 JS（或直接给 react-native-audio-api 的某入口，若可插）。
- 应用层只使用该模块作为“麦克风输入”，其余处理链（EQ、增益、输出）尽量沿用现有逻辑，只是输入源换成“已 AEC”的 PCM。

### 4.3 注意
- 部分机型 AEC 效果差或行为异常，可保留“降级”：当检测到此类设备时，自动降低最大增益或提示用户。

---

## 五、Phase 3（可选）：Android Native 抑啸

- 在 Android 侧用 C++/Kotlin 做：
  - 对**输出**或**输入**做短 FFT（如 512/1024），每 20～30ms 一次；
  - 检测到尖峰则：调一个简单 IIR Notch 或对总增益做一次衰减（如 0.9）；
  - 不暴露 FFT 到 JS，不占 JS 线程。
- 通过 JSI 或 Bridge 只给 JS 提供：`setSuppressorGain(0.9)` 或“当前是否抑啸”等简单状态，用于 UI 提示即可。

---

## 六、实施顺序建议

1. **先做 Phase 1**（本文档对应的代码改动）：  
   停 10ms 反馈环、保留/简化为固定限幅 + 固定 Notch、可选 100ms 级慢速 limiter、适当降增益。  
   → 先解决卡死和大部分啸叫体验。

2. **再做 Phase 2**：  
   在 Android 上切到 VOICE_COMMUNICATION 录音（改库或自建 native 录音）。  
   → 从源头消回声，再配合 Phase 1 的保守增益和限幅，啸叫应能彻底可控。

3. **按需 Phase 3**：  
   若 Phase 1+2 后仍有少量啸叫，再在 native 加轻量抑啸，避免任何高频率逻辑回 JS。

---

## 七、与现有代码的对应关系

- **停掉的逻辑**：`startFeedbackLoop`、`state.feedbackInterval`、所有“根据 FFT 动态改 Notch/limiter”的代码。
- **保留/简化**：输出链末的**固定** limiter、固定多频点 Notch（如 1.8k/2.2k/2.6k/3.2k）、`FEEDBACK_SUPPRESSOR` 仅作配置参考。
- **Phase 2 已做**：Android 录音使用 `InputPreset::VoiceCommunication`（patch `AndroidAudioRecorder.cpp`）；播放使用 `setUsage(VoiceCommunication)` + `setContentType(Speech)`（patch `AudioPlayer.cpp`），解决「波形有、耳机无」的耳机路由问题。
- **iOS**：使用 `iosMode: 'voiceChat'`；Android 验证通过后策略见上。

## 八、补丁与安装

- **补丁文件**：`patches/react-native-audio-api+0.11.5.patch`（录音 + 播放两处修改）。
- **应用**：`postinstall` 先执行 `patch-package`；若解析失败则回退执行：  
  `cd node_modules/react-native-audio-api && patch -p1 -i ../../patches/react-native-audio-api+0.11.5.patch`  
  详见 `docs/implementation-notes.md`。

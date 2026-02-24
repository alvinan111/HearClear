# 延迟与降噪路线图（TV 拾音场景）

本文档记录端到端延迟的测量方法、当前典型值、门控与 VAD 参数含义，以及各阶段完成标准。对应开发计划见 `.cursor/plans/` 中的 TV 拾音延迟与降噪开发计划。

---

## 一、端到端延迟测量方法

### 1.1 目标

得到「麦克风输入 → 处理 → 耳机输出」的端到端延迟（ms），便于优化与验收（建议可接受上限：&lt; 150ms 或 &lt; 100ms，以实测与听感为准）。

### 1.2 方法一：拍手 / 点击 loopback（推荐）

1. **环境**：静音或低噪环境，手机开启 HearClear，耳机连接并戴好。
2. **操作**：在手机麦克风附近**单次拍手**或使用短促**点击声**（如另一台设备播放 1 个短 beep）。
3. **采集**：用另一台设备**同时录**「现场声音 + 耳机播放出的声音」（或手机外放改为扬声器并另一手机录音），得到一条同时包含「原声」与「经 App 延迟后的声音」的录音。
4. **计算**：在音频编辑软件（Audacity、DAW 等）中看波形，对齐「原声峰」与「耳机输出峰」，两者时间差即为端到端延迟（ms）。
5. **多次**：重复 3–5 次取平均，并记录机型、系统版本、耳机类型（有线/蓝牙）、采样率。

### 1.3 方法二：App 内延迟测试（可选实现）

- 在设置中增加「延迟测试」入口：App 播放短促 beep → 麦克风收到后立即回放 → 用 `AudioContext.currentTime` 或高精度计时测「播放时刻」与「检测到回放峰的时刻」之差。
- 实现时需注意 AEC/回声消除可能压低自播 beep，可临时关闭 AEC 或使用带外信号。

### 1.4 当前典型值（待填）

| 机型/系统           | 耳机类型 | 采样率 | 端到端延迟（ms） | 备注     |
|---------------------|----------|--------|------------------|----------|
| （待真机测量后填写） | 有线     | 44100  | —                | 门控 25ms |

测量后请更新上表，并注明门控周期、是否启用 attack/release 等配置。

---

## 二、门控与 VAD 参数含义

### 2.1 门控（Noise Gate）

- **GATE_UPDATE_MS**：噪声门决策周期（ms）。越小延迟越低，但 JS 定时器与主线程负载会上升；建议 20–30ms，可配置。
- **GATE_ATTACK_MS**：门从「关」到「开」的渐变时间（ms）。过短易咔嗒，过长句首被砍；建议 10–30ms。
- **GATE_RELEASE_MS**：门从「开」到「关」的渐变时间（ms）。过短句尾被切，过长环境音拖尾；建议 80–150ms。
- **noiseGate（0–1）**：用户面「环境音抑制」强度，映射到门控阈值（如 `threshold = 0.002 + noiseGate * 0.04`）。1 = 最强抑制（仅强人声通过）。

### 2.2 软门（可选）

门输出增益可不使用 0/1 硬开关，而使用随能量连续变化的平滑曲线（软门），听感更自然，由 `AUDIO_CONFIG.GATE_SOFT_ENABLED` 或后续预设控制。

---

## 三、各阶段完成标准与当前状态

| 阶段   | 完成标准 | 当前状态 |
|--------|----------|----------|
| Phase 1 | 延迟测量方法文档就绪；门控周期 20–30ms；门控带 attack/release；可调常量入 AUDIO_CONFIG；听感上延迟与「咔嗒」明显改善。 | 已完成：GATE.UPDATE_MS=25、ATTACK_MS/RELEASE_MS、setTargetAtTime 平滑；GATE 与 SCENE_PRESETS 入 config。 |
| Phase 2 | 门控可迁 Worklet 或原生（可选）；Analyser/FFT 与底层低延迟、buffer 调查有文档记录。 | 文档已就绪（见第四节）；实现为可选后续。 |
| Phase 3 | 简单 VAD 或谱特征接入门控（可选）；TV 拾音预设；阈值与曲线可配置。 | 已完成：SCENE_PRESETS.default/tv、params.scene、设置页「场景：默认 / TV 拾音」；阈值由 preset 的 thresholdBase/Scale 可配置。 |
| Phase 4 | 谱减或轻量 NN 语音增强（可选）；人声更干净、环境音更稳抑制；以延迟 + 效果为验收标准。 | 待做：以效果与延迟为验收，可选引入小模型或谱减。 |

---

## 四、Phase 2 备注：门控/FFT 与底层

- **门控迁 Worklet（可选）**：若需进一步降延迟，可将门控逻辑迁入 [WorkletProcessingNode](https://docs.swmansion.com/react-native-audio-api/docs/worklets/worklets-introduction)，在每块 128 样本上做能量门控或小 FFT；需确认 react-native-audio-api 与 react-native-worklets 版本兼容。
- **Analyser/FFT**：门控路径可改用小 FFT（512/256）仅用于门控，UI 频谱仍用 2048；减小 FFT 时需重新标定人声频段 bin 范围。
- **底层 buffer**：react-native-audio-api 默认 128 sample-frames render quantum；系统级低延迟需查 Android Oboe/AAudio（low-latency mode、2×burst）、iOS AVAudioSession（preferredIOBufferDuration）。若 RN 库无法满足延迟目标，可评估原生管线（麦克风→门控/EQ→耳机全在原生）。

---

## 五、参考

- 管线与门控逻辑：`src/services/audio/AudioEngine.ts`
- 配置常量：`src/config/audio.ts`
- 实现约定：`docs/implementation-notes.md`

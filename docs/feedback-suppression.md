# 啸叫抑制方案对比与选型

## 问题

助听/实时放大场景下，扬声器输出被麦克风拾取形成闭环，某频点环路增益 ≥1 时产生啸叫（howling）。需要在不明显损伤人声的前提下尽量消除或抑制。

## 常见方案对比

| 方案 | 原理 | 优点 | 缺点 | 业界使用 |
|------|------|------|------|----------|
| **平台 AEC（回声消除）** | 用「参考信号」（播放内容）在麦克风输入里做回声估计并减去 | 从源头切断「播放→麦」的路径，效果最好；系统级、低延迟 | 需系统支持（iOS Voice Processing / Android VOICE_COMMUNICATION）；部分机型效果一般 | 语音通话/会议软件普遍使用 |
| **自适应反馈抵消 AFC** | 估计反馈路径，用 LMS/PEM 等做自适应对消 | 理论上可大幅抑制甚至消除反馈 | 实现复杂、计算量大、需原生或专业 DSP；易受双讲/噪声影响 | 专业助听器、部分高端方案 |
| **自适应 Notch（检测+陷波）** | 检测输出频谱尖峰（啸叫频点），动态加 notch 滤波器压该频点 | 实现简单、不依赖系统、可叠加在其他方案上 | 有检测延迟，啸叫可能先响一小段再被压；多频点需多个 notch | 助听器、会议设备常用**辅助**手段 |
| **输出限幅器 Limiter** | 对输出做动态压缩/限幅，峰值超过阈值即压下去 | 防止环路增益无限增大，啸叫一旦出现也不会无限放大；实现简单 | 不消除啸叫频点，只压住「音量爆炸」；阈值设太低会影响正常响度 | 几乎所有实时音频链路都会加一道「安全网」 |
| **固定/预防性 Notch** | 在常见共振频点（如 1k/2k/3k）预先做轻微衰减 | 降低这些频点起振概率 | 频点固定，与设备/佩戴无关；过度会损人声 | 部分产品作为补充 |

## 为何「一般软件」很少啸叫

1. **语音场景多用系统 AEC**：通话/会议 App 使用系统提供的「通话模式」（iOS `modeVoiceChat`、Android `VOICE_COMMUNICATION`），由系统做回声消除，从根上减少反馈路径。
2. **输出有限幅**：链路末端通常有 Limiter，即使有残留反馈也不会无限放大。
3. **增益相对保守**：通话类不会像助听那样做很大增益，环路增益不易 ≥1。

## 本项目当前实现（已按 android-feedback-solution 调整）

- **已移除**：JS 侧 10ms 自适应反馈环（FFT + 动态 Notch/限幅），避免卡死与 ANR。
- **平台 AEC**：iOS `iosMode: 'voiceChat'`；Android 录音与播放均使用 VoiceCommunication（见 `patches/react-native-audio-api+0.11.5.patch`）。
- **抑啸**：固定多频点 Notch（1.8k/2.2k/2.6k/3.2k）+ 固定输出限幅（按模式区分系数），不再在 JS 里做实时 FFT 调参。
- **效果**：从源头减反馈（AEC）+ 安全网（限幅 + 固定 Notch），兼顾不卡与可接受抑啸。

## 推荐组合方案（当前采用）

采用「**平台 AEC + 固定 Notch + 输出限幅**」：

1. **平台 AEC（优先）**
   - **iOS**：`setAudioSessionOptions` 使用 `iosMode: 'voiceChat'`，启用 Voice Processing I/O。
   - **Android**：录音 `InputPreset::VoiceCommunication`、播放 `Usage::VoiceCommunication` + `ContentType::Speech`（见 patch），启用系统 AEC 并正确路由到耳机。

2. **固定 Notch（无 JS 反馈环）**
   - 多频点固定 Notch（如 1800/2200/2600/3200 Hz），参数写死，不在 JS 里按 FFT 动态调整，避免主线程负载。

3. **输出限幅（安全网）**
   - 链路末端固定 Gain 限幅，按模式（耳机/外放）使用不同系数；不在 JS 里高频率更新。

## 配置与代码位置

- 啸叫相关常量：`src/config/audio.ts` → `FEEDBACK_SUPPRESSOR`（当前主要用于配置遗留；实际抑啸为固定 Notch + 限幅）。
- 会话与 AEC：`AudioEngine.start` 内 `AudioManager.setAudioSessionOptions`（iOS voiceChat）；Android 见 patch。
- 限幅与 Notch：`AudioEngine.start` 内处理链末尾（固定 Notch × N → outputLimiter → destination）；**无** `startFeedbackLoop` 或 10ms 反馈环。
- 更多细节：`docs/implementation-notes.md`、`docs/android-feedback-solution.md`。

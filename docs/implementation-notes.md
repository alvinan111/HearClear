# 实现说明与约定（当前架构）

本文档描述当前代码实现中的关键约定，便于排查问题和补充测试。

---

## 一、音频处理管线（AudioEngine）

### 1.1 数据流

```
麦克风 → RecorderAdapterNode → [rawAnalyser 环境音] → 人声带通(180–4200Hz)
      → EQ → 噪声门(人声频段能量) → mainGain → [voiceAnalyser 人声]
      → 固定 Notch(1.8k/2.2k/2.6k/3.2k) → 输出限幅 → ctx.destination
```

- **环境音**：来自 `rawAnalyser`（原始麦克风），用于双频谱「环境音」条与噪声门以外的分析。
- **人声**：来自 `voiceAnalyser`（带通 + EQ + 噪声门之后），用于双频谱「人声」条。
- **双频谱 UI**：上 = 环境音（envBars），下 = 人声（voiceBars）。若标反会误导用户。

### 1.2 与啸叫/卡死相关的已做取舍

- **已移除**：10ms JS 反馈环（FFT + 动态 Notch/限幅），避免主线程卡死与 ANR。
- **保留**：固定多频点 Notch、固定输出限幅、按模式（耳机/外放）的限幅系数。
- **Android**：录音使用 `InputPreset::VoiceCommunication`，播放使用 `Usage::VoiceCommunication` + `ContentType::Speech`，以便系统 AEC 与耳机路由。依赖 `patches/react-native-audio-api+0.11.5.patch`。

详见：`docs/android-feedback-solution.md`、`docs/feedback-suppression.md`。

### 1.3 频谱数据 getSpectrumData(numBars)

- **返回值**：`{ voice: number[], env: number[] } | null`。
- **voice**：人声频段 300–3500 Hz，来自 `voiceAnalyser`，长度 `numBars`。
- **env**：环境音低频 30–300 Hz + 高频 3500–8000 Hz，来自 `rawAnalyser`，长度 `numBars`。
- 未运行或 native 不可用时返回 `null`。

---

## 二、输出与设备

- **输出选项**：仅「普通耳机」与「骨传导」。UI 已移除外放选项；无耳机时仍可启动，仅状态栏提示「建议连接耳机」。
- **耳机拔出**：切到 NORMAL 模式，不切到 SPEAKER。
- **输入设备**：耳机连接时优先选用手机内置麦克风（`setInputDevice(builtIn.id)`），避免使用耳机麦。

---

## 三、配置与参数

- **AUDIO_CONFIG**：`src/config/audio.ts`（DEFAULT_GAIN、DEFAULT_NOISE_GATE、DEFAULT_VOICE_ENHANCE、EQ_BANDS、FEEDBACK_SUPPRESSOR 等）。
- **AUDIO_PRESETS**：按 `HeadphoneMode`（normal / bone_conduction / speaker）提供 `maxGain`、`useSpeaker`、`extraEQ`。引擎内 `mainGain` 使用 `Math.min(params.gain, preset.maxGain)` 做上限。
- **Store**：`updateParams` 只做合并，不做 gain 的 preset 上限裁剪；裁剪在 `AudioEngine.start()` 内完成。

---

## 四、Android 原生补丁与安装

- **补丁文件**：`patches/react-native-audio-api+0.11.5.patch`。
  - 录音：`AndroidAudioRecorder.cpp` → `setInputPreset(VoiceCommunication)`。
  - 播放：`AudioPlayer.cpp` → `setUsage(VoiceCommunication)`、`setContentType(Speech)`（解决耳机无声）。
- **应用方式**：`postinstall` 先执行 `patch-package`；若失败则回退执行：
  `cd node_modules/react-native-audio-api && patch -p1 -i ../../patches/react-native-audio-api+0.11.5.patch`
- 重新安装依赖后若耳机仍无声，可手动执行上述 `patch` 命令。

---

## 五、测试覆盖要点

- **AudioEngine**：Mock 下 start/stop、getSpectrumData 未运行返回 null、返回结构 `{ voice, env }` 及数组长度。
- **audio-store**：初始值、updateParams/resetParams、configLocked 时不可改、headphoneMode 切换。
- **config**：AUDIO_CONFIG 范围、AUDIO_PRESETS 各模式存在且 useSpeaker/maxGain 符合预期。
- **hooks**：useAudioAnalyser 在 status 非 running 时 bars 衰减；运行且 getSpectrumData 有数据时 voiceBars/envBars 更新。

---

## 六、常见问题对照

| 现象           | 可能原因 / 检查点 |
|----------------|--------------------|
| 波形有、耳机无 | Android 输出未走耳机：确认 patch 已应用（AudioPlayer setUsage/setContentType）。 |
| 人声/环境音反了 | 双频谱数据与标签对应：上=env、下=voice。 |
| 啸叫/卡死      | 确认无 10ms FFT 反馈环；抑啸仅固定 Notch + 限幅。 |
| 无耳机无法启动 | 当前设计：可启动，仅提示；不弹窗不拦启动。 |

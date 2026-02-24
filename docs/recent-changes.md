# 近期需求变更与修复记录

用于回归测试与测试用例设计时对照，避免遗漏或误改。

---

## 需求与行为变更

| 项目 | 变更说明 | 相关文件/备注 |
|------|----------|----------------|
| 啸叫与卡死 | 移除 10ms JS 反馈环；抑啸改为固定 Notch + 固定限幅；可降增益上限 | AudioEngine、config、android-feedback-solution.md |
| 默认音量 | 默认增益约 2 倍（如 6dB）或按产品定为 12dB | config DEFAULT_GAIN、滑块 100% 对应关系 |
| 滑块 | 无动画、跟手，用 PanResponder 实现 SimpleSlider 替换 TechSlider | app/(tabs)/index.tsx |
| 人声/环境音 | 强区分人声与环境音；默认人声增强、环境音压到约 1%；人声带通 180–4200Hz、动态噪声门 | AudioEngine、config、双频谱 UI |
| 人声/环境音识别 | 双频谱「人声」与「环境音」标签与数据对应：上=环境音(env)、下=人声(voice) | index.tsx DualSpectrum、implementation-notes.md |
| 回音/啸叫 | 不能有一点回音；Android 录音与播放均使用 VoiceCommunication；多固定 Notch、外放限幅更严 | patch、AudioEngine |
| 外放选项 | 删除外放相关选项；输出仅保留「耳机」「骨传导」 | index.tsx、presets 仍保留 SPEAKER 供引擎内部使用 |
| 无耳机 | 可启动、可收音、显示波形，仅提示「建议连接耳机」，不弹窗不拦启动 | index.tsx |
| 耳机连接时音源 | 使用手机内置麦克风，不用耳机麦 | AudioEngine.start setInputDevice(builtIn) |
| 耳机无声 | Android 播放输出需 setUsage(VoiceCommunication)+setContentType(Speech)，否则可能不路由到耳机 | patch AudioPlayer.cpp、implementation-notes.md |

---

## 已知问题与测试重点

- **patch 解析**：`patch-package` 可能无法解析多文件或部分格式的 patch，postinstall 已做回退（系统 `patch`）。
- **增益裁剪**：store 不裁剪 gain；引擎 start 时用 `Math.min(params.gain, preset.maxGain)`，需保证各模式 maxGain 与 config 一致。
- **双频谱**：Dev Build 用 `getSpectrumData()`，Expo Go 用麦克风电平仿频谱；停止时 bars 应平滑归零。
- **configLocked**：离线未付费时禁止 updateParams/resetParams，store 与 UI 需一致。

---

## 回归检查清单（建议）

- [ ] 启动/停止不崩溃，Mock 与 Dev Build 行为符合预期
- [ ] 无耳机时可启动，仅状态栏提示
- [ ] 双频谱：上=环境音、下=人声，停止后归零
- [ ] 滑块：音量/人声增强/噪声门 跟手、无异常动画
- [ ] 耳机模式切换（普通/骨传导）生效
- [ ] Android：安装后 patch 已应用，耳机有声音
- [ ] configLocked 时参数不可修改与重置

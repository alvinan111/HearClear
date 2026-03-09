# 听力测试与处方、反馈修正

本文档说明 HearClear 中**听力测试**、**处方计算**与**运行中反馈修正**的协议与实现，供产品与开发参考。

---

## 一、听力测试（非临床、仅供参考）

### 1.1 定位与免责

- 本测试为**辅助自测工具**，**非临床诊断**，结果仅供参考。
- 助听功能为辅助聆听，不替代专业助听器或医疗建议。
- 测试页与条款中已注明「非医疗设备、仅供辅助」。

### 1.2 测试协议

- **方式**：纯音测听（Pure-Tone Audiometry）
- **频率**：6 档 — 250, 500, 1000, 2000, 4000, 8000 Hz
- **流程**：简化 Hughson-Westlake  
  - 从起始电平（如 30 dB）开始  
  - 用户听到 → 降 10 dB；听不到 → 升 5 dB  
  - 重复 2–3 次转折后，取最近 2 次转折电平的平均作为该频率听阈
- **输出**：`Audiogram` — 各频率的听阈（dB，相对设备，非校准 dB HL）

### 1.3 技术实现

- **引擎**：`src/services/hearing-test/HearingTestEngine.ts`  
  - 使用 `react-native-audio-api` 的 `AudioContext.createOscillator()` + `GainNode` 播放正弦波  
  - 阶梯式升降电平，每档持续约 800ms
- **UI**：`app/hearing-test.tsx` — 戴耳机说明、逐频率测试、进度、结果预览、跳过/完成
- **入口**：引导页最后一屏「开始听力测试」或「暂不测试」；设置页「听力测试」可重新测

---

## 二、处方计算（Prescription）

### 2.1 公式

- 参考 NAL-NL2 思路，采用**半增益规则**简化：  
  **G(f) = k × HL(f)**  
  - `HL(f)`：该频率的听力损失（dB，来自听力图）  
  - `k`：0.4–0.5（当前取 0.45）
- 对 6 个测听频率的增益做**线性插值**，得到 **7 个 EQ 频带**的增益：  
  100, 250, 800, 1000, 2500, 4000, 8000 Hz（与 `EQ_BANDS` 一致）

### 2.2 实现

- **文件**：`src/services/hearing-test/prescription.ts`  
- **函数**：`audiogramToPrescription(audiogram: Audiogram): Prescription`  
- 无处方时（用户跳过测试）：引擎保持原有均匀放大逻辑

---

## 三、反馈修正（运行中）

### 3.1 简单三档

- **太大声**：`feedbackCorrection.overall -= 2` dB  
- **太小声**：`feedbackCorrection.overall += 2` dB  
- **刚好**：`feedbackCorrection.overall = 0`

### 3.2 高级：分频段

- 可展开「低频 / 中频 / 高频」微调，每档 ±6 dB  
- 低频约 100–500 Hz，中频约 500–2k Hz，高频约 2k–8k Hz  
- 限幅与持久化：`src/services/hearing-test/feedbackCorrection.ts`  
  - `clampFeedbackCorrection()`：overall 与各频段 ±6 dB  
  - `persistFeedbackCorrection()`：写入 `STORAGE_KEYS.FEEDBACK_CORRECTION`  
  - 启动时通过 `audio-store.hydrateFromStorage()` 读回

---

## 四、信号链中的位置

- **存储**：`AUDIOGRAM`、`PRESCRIPTION`、`FEEDBACK_CORRECTION`（见 `src/constants/trial.ts`）
- **引擎**：`AudioEngine` 在门控循环中定期读取 `params.prescription` 与 `params.feedbackCorrection`，更新前 7 个 EQ 滤波器的 `gain.value`：  
  **各频带增益 = 基础 EQ 增益 × voiceEnhance + 处方增益 + 反馈修正（overall + 对应频段）**
- 详见 `docs/native-audio-architecture.md` 中「处方与反馈在信号链中的位置」。

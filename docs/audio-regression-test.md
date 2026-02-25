# 音频回归测试：带环境音 / 去环境音留人声

本测试集用于**核心算法回归**：每条用例为一对音频——**带环境音的输入**与**去除环境音只留人声的参考**。至少 100 条。每次更新门控、EQ、增益、降噪等核心算法后，必须运行本测试并对比评分。

## 测试集位置与结构

- **清单**：`test-data/audio-regression/manifest.json`（100 条：id、noisy 路径、clean 路径、scene）
- **样本目录**：`test-data/audio-regression/samples/noisy/`、`samples/clean/`（需自行准备或从公开数据集下载，见 `test-data/audio-regression/README.md`）
- **报告输出**：`test-data/audio-regression/reports/`（每次运行生成带时间戳的 JSON）

## 数据来源（至少 100 条）

从以下公开数据集中选取 **noisy / clean 配对**，按 manifest 命名放入 `samples/`：

- **DNS Challenge**：https://github.com/microsoft/DNS-Challenge  
- **VoiceBank+DEMAND**：https://datashare.ed.ac.uk/handle/10283/2791  
- **CHiME** 等（见 `test-data/audio-regression/README.md`）

格式：WAV、单声道，推荐 16kHz 或 44.1kHz；noisy 与 clean 需对齐（同一句话）。

## 运行方式

在项目根目录执行：

```bash
npm run test:audio-regression
```

或直接：

```bash
node scripts/audio-regression/run.mjs
```

脚本会：

1. 读取 `manifest.json`
2. 对每条用例：若存在对应 `noisy`、`clean` 文件，则加载并做离线门控+增益处理，与 clean 对比
3. 输出每条得分（correlation_output、seg_snr_improvement_db 等）及汇总
4. 将报告写入 `test-data/audio-regression/reports/report-<timestamp>.json`

## 评分指标

- **correlation_output**：算法输出与 clean 参考的相关系数（越高越接近人声）
- **seg_snr_improvement_db**：相对输入的分段 SNR 提升（dB）
- **summary**：所有有效条目的平均 correlation_output、平均 snr_improvement_db

## 约定：每次更新核心算法后

1. **运行**：执行 `npm run test:audio-regression`
2. **对比**：将新报告与上一版或 `reports/baseline.json` 对比，确认：
   - 平均 correlation_output 不下降（或符合预期）
   - 平均 snr_improvement_db 不下降（或符合预期）
3. **基线**：若当前版本为认可基线，可将报告复制为 `reports/baseline.json` 供后续对比。

相关实现：`scripts/audio-regression/run.mjs`、门控/EQ 逻辑与 `src/config/audio.ts`、`src/services/audio/AudioEngine.ts`。

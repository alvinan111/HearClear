# 音频回归测试集：带环境音 → 去环境音留人声

本目录用于**核心算法回归测试**：每条用例为一对音频——**带环境音**的输入与**仅人声**的参考。每次更新门控/EQ/增益等核心算法后，必须运行本测试集并对比评分（见下方「运行与约定」）。

## 目录结构

```
test-data/audio-regression/
├── README.md           # 本说明
├── manifest.json       # 至少 100 条用例（noisy / clean 路径与元数据）
├── samples/            # 需自行准备或从数据集下载
│   ├── noisy/          # 带环境音的输入：001.wav, 002.wav, ...
│   └── clean/          # 去除环境音只留人声的参考：001.wav, 002.wav, ...
├── reports/            # 脚本生成的评分报告（可提交做基线对比）
│   └── .gitkeep
└── baseline.json       # 可选：当前认可的分数字段，用于对比
```

## 数据来源（至少 100 条）

可选用以下公开数据集中的 **noisy / clean 配对**，按 `manifest.json` 的命名放入 `samples/noisy/` 与 `samples/clean/`：

| 数据集 | 说明 | 获取方式 |
|--------|------|----------|
| **DNS Challenge** | 带环境音与干净人声配对，含合成与真实录音 | https://github.com/microsoft/DNS-Challenge |
| **VoiceBank+DEMAND** | 干净语音 + 噪声混合，常用做语音增强评测 | https://datashare.ed.ac.uk/handle/10283/2791 |
| **CHiME** | 多通道含噪语音与参考 | http://spandh.dcs.shef.ac.uk/chime_challenge/ |
| **Reverb Challenge** | 混响与噪声 | 按需搜索 |

建议：从 DNS Challenge 或 VoiceBank+DEMAND 中选取至少 100 对，重命名为 `001.wav`…`100.wav`，分别放入 `noisy/` 与 `clean/`。

## 格式要求

- **格式**：WAV，单声道（mono），推荐 16kHz 或 44.1kHz（与 `AUDIO_CONFIG.SAMPLE_RATE` 一致时无需重采样）。
- **长度**：建议每段 3–10 秒，便于批量跑回归。
- **对齐**：`noisy/xxx.wav` 与 `clean/xxx.wav` 应对齐（同一句话，clean 为仅人声版本）。

## 运行与约定

- **运行命令**（在项目根目录）：
  ```bash
  node scripts/audio-regression/run.mjs
  ```
- **输出**：在 `test-data/audio-regression/reports/` 下生成带时间戳的报告 JSON，包含每条用例的得分及汇总。
- **约定**：**每次更新核心算法（门控、EQ、增益、降噪逻辑等）后，必须运行上述命令，对比新报告与上一版/基线报告，确认评分未退化。**

基线可保存为 `reports/baseline.json` 或由 CI 保存上一次通过的报告路径。

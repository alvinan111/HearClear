# 人声降噪自测

本目录用于在**固定测试集**或**自备带噪音频**上对比不同降噪/人声增强方案，用客观指标（PESQ、STOI）选出最佳方案。

## 测试集来源

| 来源 | 说明 | 获取方式 |
|------|------|----------|
| **VoiceBank-DEMAND** | 标准语音增强 benchmark，含 clean / noisy 配对，16kHz | `run_self_test.py --source voicebank` 自动从 Hugging Face 拉取（需 `datasets`） |
| **DNS Challenge** | Microsoft 举办的 DNS 挑战，含合成带噪与真实场景 | 见 [microsoft/DNS-Challenge](https://github.com/microsoft/DNS-Challenge)，可手动下载 test set |
| **无配对参考** | 只有一段带噪音频，没有干净人声 | 使用 `--reference-from-separation`：用**人声分离模型**（Demucs 等）从带噪音频中分离出人声轨，作为「参考」再算 PESQ/STOI |

### 用分离模型生成参考（无配对时）

当没有「干净人声」参考时，可对**带噪音频**做人声分离，得到「人声轨」作为参考，再与「我们增强后的结果」做客观对比：

- **Demucs**（Meta）：`pip install demucs`，支持 `demucs -n htdemucs 带噪.wav` 分离出 `vocals.wav`，可作为参考。
- **Hugging Face**：部分 Space 或 pipeline 提供 speech separation，可脚本调用（见下方 `--reference-from-separation`）。

自测脚本支持 `--reference-from-separation`，会先对输入的带噪文件做人声分离，再用分离出的人声作为参考计算 PESQ/STOI。

## 环境

- **Python 3.8+** 推荐（pesq 等依赖在 3.8+ 下安装更顺利）。
- 若仅用本地文件（`--noisy` / `--clean`），最少需要：`numpy`, `scipy`, `soundfile`, `pesq`, `pystoi`。
- 使用 **VoiceBank**（`--source voicebank`）时，Hugging Face `datasets` 解码 Audio 列可能需安装 **torchcodec**：`pip install torchcodec`（若报错 “To support decoding audio data, please install 'torchcodec'”）。

## 运行

```bash
cd /path/to/HearClear
pip install -r scripts/denoising-self-test/requirements.txt
python scripts/denoising-self-test/run_self_test.py --source voicebank
```

- `--source voicebank`：从 Hugging Face 加载 VoiceBank-DEMAND-16k 的测试条目的若干条，自动取 clean/noisy 配对。
- `--noisy /path/to/noisy.wav --clean /path/to/clean.wav`：本地配对文件（16kHz 单声道）。
- `--noisy /path/to/noisy.wav --reference-from-separation`：仅带噪文件，用 Demucs 分离出人声作参考（需安装 `demucs`）。
- `--schemes passthrough`：只跑「直通」方案；默认会跑 `passthrough` 及脚本内已实现的其它方案（如占位 rnnoise/sherpa，后续可接真实实现）。

输出为各方案的 **PESQ**、**STOI** 表格，便于找出最佳方案。

## 指标说明

- **PESQ**（1–4.5）：感知语音质量，越高越好。
- **STOI**（0–1）：短时客观可懂度，越高越好。

均需 16kHz 单声道；脚本会做重采样/单声道化。

## 如何选出最佳方案

运行脚本后，表格中 **PESQ**、**STOI** 越高越好。比较各方案均值即可得到当前最佳；若多方案接近，可增加 `--max-samples` 用更多条再跑一次。  
在 `run_self_test.py` 的 `SCHEMES` 中接入 RNNoise、sherpa-onnx、FastEnhancer 等真实实现后，重新运行即可更新「最佳方案」结论。

## 添加新方案

在 `run_self_test.py` 的 `SCHEMES` 中增加条目：输入为 (noisy 数组, sr)，输出为 (enhanced 数组, sr)。例如接入 RNNoise、sherpa-onnx、FastEnhancer 时，在此处调用对应可执行或 Python API，输出增强后的 16kHz 单声道数组即可。

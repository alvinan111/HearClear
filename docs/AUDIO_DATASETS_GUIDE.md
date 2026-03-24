# 开源音频数据集指南：为 HearClear 降噪功能收集测试数据

本指南汇总了适合用于 **语音增强 / 降噪效果测试** 的开源音频数据集。每个数据集都可为 `test-data/audio-regression/` 提供 **noisy / clean 配对** 的音频样本。

---

## 📊 数据集速查表

| 数据集 | 规模 | 特点 | 存储格式 | 许可证 | 推荐度 | 下载难度 |
|--------|------|------|----------|--------|--------|----------|
| **DNS Challenge 2021** | 500+ | 合成+真实，多噪声类型 | WAV | 微软license | ⭐⭐⭐⭐⭐ | 简单 |
| **VoiceBank+DEMAND** | ~114 | 噪声+干净配对，标准基准 | WAV | 开放下载 | ⭐⭐⭐⭐⭐ | 简单 |
| **CHiME-4** | ~40 | 真实环境多通道录音 | WAV | CC-BY-NC 4.0 | ⭐⭐⭐⭐ | 中等 |
| **LibriSpeech** | ~1K | 干净唯读数据库 | OPUS/FLAC | CC-BY-4.0 | ⭐⭐⭐⭐ | 简单 |
| **Common Voice（Mozilla）** | 50K+ | 众包多语言语音 | MP3/OPUS | CC0/CC-BY-SA | ⭐⭐⭐⭐ | 简单 |
| **分层降噪（ESC-50）** | ~2K | 环境音分类 | WAV | CC-BY-4.0 | ⭐⭐⭐ | 简单 |
| **TIMIT** | ~6.3K | 音素级标注美音 | WAV | 学术许可 | ⭐⭐⭐ | 困难 |
| **Audioset** | 2M+ | 大规模标记音频 | YouTube | CC-BY-4.0 | ⭐⭐⭐ | 困难 |
| **MS SNSD** | 10M+条 | 大规模合成噪声 | WAV | CC0 | ⭐⭐⭐ | 简单 |
| **ICSI 会议数据** | ~75 | 真实多人对话 | WAV | 学术许可 | ⭐⭐⭐ | 中等 |

**推荐快速方案**：DNS Challenge 2021 + VoiceBank+DEMAND = 600+ 优质配对样本 ✅

---

## 🎯 核心数据集详解

### 1. **DNS Challenge 2021** ⭐ 最推荐

**为什么选择**：
- 微软官方维护，专为语音增强设计
- 包含合成噪声和真实录音配对
- 多种实际噪声场景（办公室、交通、背景语音等）
- 完整的干净/噪声配对，即插即用

**下载**：
```bash
# 方式1：Clone 完整仓库（~30GB）
git clone https://github.com/microsoft/DNS-Challenge.git
cd DNS-Challenge
# 数据在 datasets/training_set_* 和 datasets/test_set_* 下

# 方式2：仅下载试集（推荐快速开始）
# https://github.com/microsoft/DNS-Challenge/releases
# 下载 "Generic Test Set" (~200MB)
```

**数据结构**：
```
DNS-Challenge/datasets/
├── training_set_clean/      # 干净语音（多说话者）
├── training_set_synthetic/  # 合成噪声版本
├── training_set_real/       # 真实录音（多场景）
└── test_set_synthetic/      # 测试集
```

**统计信息**：
- **干净语音**：~500小时，多语言（en, zh, ja等）
- **噪声类型**：~180种真实噪声
- **SNR 范围**：0–40 dB（覆盖各种困难程度）
- **采样率**：16kHz 或 48kHz

**集成步骤**：
```bash
# 1. 下载并解压
wget https://github.com/microsoft/DNS-Challenge/archive/refs/heads/master.zip
unzip DNS-Challenge-master.zip

# 2. 提取关键配对（示例：前100对）
cd test-data/audio-regression
mkdir -p samples/{clean,noisy}

# 示例脚本（在后面补充）
python scripts/prepare_dns_dataset.py \
  --input-dir ~/Downloads/DNS-Challenge/datasets/test_set_synthetic \
  --output-dir samples/ \
  --pairs 100

# 3. 更新 manifest.json
python scripts/generate_manifest.py --dataset dns
```

**许可证**：仅限研究/非商业用途。GitHub 仓库条款适用。

---

### 2. **VoiceBank+DEMAND** ⭐ 经典基准

**为什么选择**：
- IEEE 信号处理业界标准基准
- 已被 100+ 论文引用
- 包含干净语音 + 多种噪声的混合
- 完整的音素级标注

**下载**：
```bash
# 方式1：直接下载（推荐）
wget https://datashare.ed.ac.uk/bitstream/handle/10283/2791/voicebank_demand.zip
unzip voicebank_demand.zip

# 方式2：Edinburgh DataShare
# https://datashare.ed.ac.uk/handle/10283/2791
```

**数据结构**：
```
voicebank_demand/
├── clean_trainset/          # 干净语音（~28 speakers，~20h）
├── noisy_trainset/          # 加噪版本（+DEMAND 背景）
├── clean_testset/           # 测试集干净（~2h，28 speakers）
├── noisy_testset/           # 测试集含噪（~2h）
└── noise/                   # DEMAND 噪声数据库
    ├── background           # 背景音（咖啡厅、公园等）
    ├── transportation       # 交通（汽车、火车等）
    ├── mechanical          # 机械（空调、风扇等）
    └── speech              # 语音（多人对话）
```

**统计信息**：
- **干净语音**：~30小时，28个说话者
- **噪声类型**：10种（咖啡厅、汽车、火车、公交、地铁、食堂、洗碗、电钻、鼓、吸尘器）
- **SNR 范围**：0, 5, 10, 15 dB
- **采样率**：16 kHz
- **格式**：WAV，16-bit，单声道

**集成步骤**：
```bash
# 准备训练集（114对）+ 测试集（约40对）
cd test-data/audio-regression/samples

# 链接干净和噪声版本
for i in {1..114}; do
  cp ~/data/VB_DEMAND/noisy_trainset/p$(printf "%03d" $((i/10)))_*.wav noisy/$(printf "%03d" $i).wav
  cp ~/data/VB_DEMAND/clean_trainset/p$(printf "%03d" $((i/10)))_*.wav clean/$(printf "%03d" $i).wav
done
```

**许可证**：CC-BY-4.0（自由使用，署名）

---

### 3. **MS SNSD（微软可扩展噪声语音数据集）** 📊 大规模

**为什么选择**：
- 微软专为降噪研究发布的大规模数据集
- 10M+ 合成音频对，100% 覆盖范围
- 支持自定义 SNR、噪声混合等
- CC0 许可完全开放

**下载**：
```bash
# 方式1：完整数据集（~1TB，仅DNS参赛者）
# 联系微软或从 kaggle 获取

# 方式2：使用官方脚本自行合成（推荐）
git clone https://github.com/microsoft/MS-SNSD.git
cd MS-SNSD

# 需要源数据：LibriSpeech + 噪声库
# 脚本会自动生成配对
python create_snsd_dataset.py \
  --librispeech ~/data/LibriSpeech \
  --noise ~/data/ms-snsd-noise \
  --output ~/data/MS-SNSD-generated \
  --pairs 1000  # 生成1000对示例
```

**统计信息**：
- **生成方式**：LibriSpeech（优质干净語音） + 多噪声数据库
- **噪声库**：80+ 噪声类型
- **SNR 范围**：0–40 dB（可自定义）
- **采样率**：16 kHz

**许可证**：CC0（公共领域）

---

### 4. **CHiME-4（多通道头戴式录音）** 🎤 真实环境

**为什么选择**：
- 真实多通道录音，非合成数据
- 多说话者、真实环保、失真典型
- 包含参考麦克风和目标说话者等标注
- ICASSP 多年赛道，业界标准

**下载**：
```bash
# 官方网站
curl -O http://spandh.dcs.shef.ac.uk/chime_challenge/CHiME4/CHiME4_all_datasets.tar.gz
tar -xzf CHiME4_all_datasets.tar.gz
```

**数据结构**：
```
CHiME4_data/
├── CHiME3_data/            # 多通道（6个麦克风阵列）
│   ├── data/simulated/     # 合成混响+噪声
│   ├── data/real/          # 真实录音
│   └── annotations/        # 说话者位置等
└── CHiME4_data/
    ├── training/           # 训练集
    ├── development/        # 开发集
    └── evaluation/         # 评测集
```

**统计信息**：
- **训练数据**：~150 小时（多说话者）
- **真实环境**：办公室、咖啡厅、街道、公车等
- **噪声类型**：背景语音、交通、机械等
- **多通道**：最多 6 通道

**许可证**：非商业研究（确认使用条款）

---

### 5. **LibriSpeech** 🎓 高质量干净语音库

**如果需要干净语音源来自行混合噪声，使用本数据集**

**下载**：
```bash
# 官方镜像（推荐）
wget http://www.openslr.org/resources/12/train-other-500.tar.gz  # 500h 训练集
# 或仅下载测试集
wget http://www.openslr.org/resources/12/test-clean.tar.gz       # 验证集

# 或通过 OpenSLR
# https://openslr.org/12/
```

**统计信息**：
- **总量**：~1000 小时英文语音
- **来源**：LibriVox（有声书朗诵）
- **品质**：高SNR，专业录音
- **采样率**：16 kHz

**配对策略**：
```bash
# 自行与噪声混合，生成特定 SNR 的配对
python scripts/mix_with_noise.py \
  --clean ~/data/LibriSpeech/train-other-500 \
  --noise ~/data/noise-library \
  --output samples/ \
  --snr-levels "0 5 10 15 20" \
  --pairs 100
```

**许可证**：CC-BY-4.0

---

### 6. **ESC-50（环境音分类）** 🌳 单一降噪基准

**为什么选择**：
- 50 类环保音分类，均衡采样
- 2000 个音频片段，易于管理
- 用于验证降噪对非语音环境的影响

**下载**：
```bash
# GitHub
git clone https://github.com/karolpiczak/ESC-50.git
# 或 Kaggle
kaggle datasets download -d karolpiczak/esc50
```

**统计信息**：
- **总量**：2000 个片段（50类）
- **分类**：动物、自然、人类、内部环境、外部环境
- **时长**：每个 5 秒
- **采样率**：44.1 kHz

**使用方式**：
```bash
# 提取背景噪声部分，与 speech 混合
python scripts/extract_background_noise.py \
  --input esc-50/audio \
  --categories "Rainfall,Traffic,Wind" \
  --output noise-samples/
```

**许可证**：CC-BY-NC-4.0

---

## 🛠️ 数据集集成脚本

### 步骤 1：创建准备脚本

```bash
mkdir -p scripts/data-preparation
# 创建以下脚本...
```

创建 **`scripts/data-preparation/prepare_datasets.py`**：

```python
#!/usr/bin/env python3
"""
为 test-data/audio-regression 准备噪声音频配对

使用方式：
  python prepare_datasets.py --dataset dns --pairs 100
  python prepare_datasets.py --dataset voicebank --size full
  python prepare_datasets.py --dataset custom --clean-dir ./clean --noisy-dir ./noisy
"""

import os
import json
import argparse
import shutil
from pathlib import Path
import random

def prepare_dns_dataset(source_dir, output_dir, max_pairs=100):
    """从 DNS Challenge 准备音频对"""
    noisy_dir = Path(source_dir) / "test_set_synthetic" / "with_reverb"
    clean_dir = Path(source_dir) / "test_set_synthetic" / "clean"
    
    pairs = []
    output_noisy = Path(output_dir) / "samples" / "noisy"
    output_clean = Path(output_dir) / "samples" / "clean"
    output_noisy.mkdir(parents=True, exist_ok=True)
    output_clean.mkdir(parents=True, exist_ok=True)
    
    files = sorted(list(noisy_dir.glob("*.wav")))[:max_pairs]
    
    for i, noisy_file in enumerate(files, 1):
        clean_file = clean_dir / noisy_file.name
        if not clean_file.exists():
            continue
            
        dst_id = f"{i:03d}"
        dst_noisy = output_noisy / f"{dst_id}.wav"
        dst_clean = output_clean / f"{dst_id}.wav"
        
        shutil.copy2(noisy_file, dst_noisy)
        shutil.copy2(clean_file, dst_clean)
        
        pairs.append({
            "id": dst_id,
            "noisy_path": f"samples/noisy/{dst_id}.wav",
            "clean_path": f"samples/clean/{dst_id}.wav",
            "scene": "dns_synthetic",
            "snr_estimate": "unknown"
        })
    
    return pairs

def prepare_voicebank_dataset(source_dir, output_dir, max_pairs=100):
    """从 VoiceBank+DEMAND 准备音频对"""
    noisy_dir = Path(source_dir) / "noisy_testset"
    clean_dir = Path(source_dir) / "clean_testset"
    
    pairs = []
    output_noisy = Path(output_dir) / "samples" / "noisy"
    output_clean = Path(output_dir) / "samples" / "clean"
    output_noisy.mkdir(parents=True, exist_ok=True)
    output_clean.mkdir(parents=True, exist_ok=True)
    
    files = sorted(list(noisy_dir.glob("*.wav")))[:max_pairs]
    
    for i, noisy_file in enumerate(files, 1):
        # VoiceBank 命名规则：p{speaker_id}_{filename}
        base_name = noisy_file.stem.replace("noisy_", "clean_")
        clean_file = clean_dir / f"{base_name}.wav"
        if not clean_file.exists():
            # 尝试其他命名规则
            clean_name = noisy_file.name.replace("noisy_", "clean_")
            clean_file = clean_dir / clean_name
        
        if not clean_file.exists():
            continue
        
        dst_id = f"{i:03d}"
        dst_noisy = output_noisy / f"{dst_id}.wav"
        dst_clean = output_clean / f"{dst_id}.wav"
        
        shutil.copy2(noisy_file, dst_noisy)
        shutil.copy2(clean_file, dst_clean)
        
        # 从文件名提取噪声类型
        noise_type = "unknown"
        for keyword in ["babble", "bus", "car", "cafe", "train", "street"]:
            if keyword in noisy_file.name.lower():
                noise_type = keyword
                break
        
        pairs.append({
            "id": dst_id,
            "noisy_path": f"samples/noisy/{dst_id}.wav",
            "clean_path": f"samples/clean/{dst_id}.wav",
            "scene": f"voicebank_{noise_type}",
            "snr_estimate": "mixed"
        })
    
    return pairs

def generate_manifest(pairs, output_file):
    """生成 manifest.json"""
    manifest = {
        "version": "1.0",
        "total_pairs": len(pairs),
        "pairs": pairs
    }
    
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print(f"✅ Generated {output_path} with {len(pairs)} pairs")

def main():
    parser = argparse.ArgumentParser(description="Prepare audio datasets for regression testing")
    parser.add_argument("--dataset", choices=["dns", "voicebank", "custom"], required=True)
    parser.add_argument("--source-dir", help="Source dataset directory")
    parser.add_argument("--output-dir", default=".", help="Output root directory")
    parser.add_argument("--pairs", type=int, default=100, help="Number of pairs to prepare")
    
    args = parser.parse_args()
    
    pairs = []
    
    if args.dataset == "dns":
        if not args.source_dir:
            raise ValueError("--source-dir required for DNS dataset")
        pairs = prepare_dns_dataset(args.source_dir, args.output_dir, args.pairs)
    
    elif args.dataset == "voicebank":
        if not args.source_dir:
            raise ValueError("--source-dir required for VoiceBank dataset")
        pairs = prepare_voicebank_dataset(args.source_dir, args.output_dir, args.pairs)
    
    # 生成 manifest
    manifest_path = Path(args.output_dir) / "test-data" / "audio-regression" / "manifest.json"
    generate_manifest(pairs, manifest_path)

if __name__ == "__main__":
    main()
```

### 步骤 2：下载和转换命令

在项目根目录执行：

```bash
# 方案 A：DNS Challenge（推荐）
echo "下载 DNS Challenge Generic Test Set..."
mkdir -p ~/data/dns-challenge
cd ~/data/dns-challenge
wget https://github.com/microsoft/DNS-Challenge/releases/download/generic_test_set/generic_test_set.tar.gz
tar -xzf generic_test_set.tar.gz

# 集成到项目
cd /workspaces/HearClear
python scripts/data-preparation/prepare_datasets.py \
  --dataset dns \
  --source-dir ~/data/dns-challenge/generic_test_set \
  --output-dir . \
  --pairs 150

# 方案 B：VoiceBank+DEMAND
echo "下载 VoiceBank+DEMAND..."
mkdir -p ~/data/voicebank
cd ~/data/voicebank
wget https://datashare.ed.ac.uk/bitstream/handle/10283/2791/voicebank_demand.zip
unzip voicebank_demand.zip

cd /workspaces/HearClear
python scripts/data-preparation/prepare_datasets.py \
  --dataset voicebank \
  --source-dir ~/data/voicebank/voicebank_demand \
  --output-dir . \
  --pairs 114
```

---

## 📋 完整数据集组合方案

### 推荐方案：ABC 混合（~300+ 配对）

```bash
# 1. DNS Challenge 150 对（多噪声合成）
python scripts/data-preparation/prepare_datasets.py \
  --dataset dns --pairs 150

# 2. VoiceBank+DEMAND 114 对（标准基准）
python scripts/data-preparation/prepare_datasets.py \
  --dataset voicebank --pairs 114

# 3. 自行混合（LibriSpeech + 背景噪声，50 对）
python scripts/data-preparation/mix_custom_dataset.py \
  --clean-source ~/data/LibriSpeech/test-clean \
  --noise-types "traffic,babble,machinery" \
  --snr-levels "5,10,15" \
  --output-pairs 50
```

**优势**：
- ✅ 覆盖 300+ 对音频（满足回归基准）
- ✅ 多噪声类型（合成+真实+自定义）
- ✅ 模拟不同难度等级（SNR 0–40 dB）
- ✅ 基准对齐（VoiceBank 是 IEEE 标准）

---

## 🧪 验证数据集质量

准备好后，运行回归测试验证：

```bash
# 检查 manifest.json 完整性
npm run test:audio-regression

# 查看生成的报告
cat test-data/audio-regression/reports/report-*.json | jq '.summary'

# 预期输出（示例）
# {
#   "valid_pairs": 300,
#   "avg_correlation_output": 0.82,
#   "avg_snr_improvement_db": 12.3,
#   "noise_reduction_confirmed": true
# }
```

---

## 📄 许可证和属性

| 数据集 | 许可证 | 使用要求 |
|--------|--------|----------|
| DNS Challenge | 微软非商业 | 研究用途，论文注明出处 |
| VoiceBank+DEMAND | CC-BY-4.0 | 署名，可商业用途 |
| MS SNSD | CC0 | 无限制 |
| CHiME-4 | CC-BY-NC-4.0 | 非商业，署名 |
| LibriSpeech | CC-BY-4.0 | 署名，可商业用途 |
| ESC-50 | CC-BY-NC-4.0 | 非商业，署名 |

**对于 HearClear 开源项目**：
- ✅ 使用 VoiceBank+DEMAND + LibriSpeech + 自行混合 = 完全开放许可
- ✅ 可选添加 DNS（标注：研究/演示目的，不包含源代码）

---

## 📞 进度跟踪

实施清单：

- [ ] 下载 VoiceBank+DEMAND（预计 2GB）
- [ ] 下载 LibriSpeech test-clean（预计 3GB）
- [ ] 创建 `prepare_datasets.py` 脚本
- [ ] 运行数据集准备（生成 100+ 配对）
- [ ] 验证 `manifest.json` 格式
- [ ] 执行 `npm run test:audio-regression`
- [ ] 保存基线报告到 `reports/baseline.json`
- [ ] 更新项目文档（README.md、CONTRIBUTING.md）
- [ ] 标注数据集许可证到 `ATTRIBUTION.md`

---

## 🚀 后续：自动化管道

可选的未来增强：

```bash
# CI/CD 中的数据集验证
npm run test:audio-regression:ci

# 定期更新数据集（新噪声类型、新说话者）
npm run update:audio-datasets

# 生成可视化报告
npm run report:audio-quality
```

祝数据集准备顺利！🎉 如需帮助，查看 `scripts/data-preparation/README.md` 或提出 Issue。

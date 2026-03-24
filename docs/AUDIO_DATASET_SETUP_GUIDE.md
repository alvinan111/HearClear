# HearClear 音频数据集集成指南

本指南说明如何为 HearClear 的降噪功能快速集成开源音频测试数据集。

---

## 🚀 快速开始（5 分钟）

### 方案 A：一键快速启动（推荐新手）

```bash
cd /workspaces/HearClear

# 执行快速启动（仅下载 VoiceBank+DEMAND，~2GB，最稳定）
bash scripts/setup-audio-datasets.sh --quick-start
```

**预期时间**：15–30 分钟（取决于网络）  
**最终结果**：114 对音频配对，manifest.json 已生成，可直接运行测试

### 方案 B：完整推荐方案（有网络条件）

```bash
cd /workspaces/HearClear

# 执行完整设置（DNS Challenge + VoiceBank，~5GB，覆盖度最佳）
bash scripts/setup-audio-datasets.sh --full
```

**预期时间**：45–60 分钟  
**最终结果**：200+ 对音频配对，多噪声类型覆盖

---

## 📋 详细步骤

### 步骤 1：检查环境

```bash
# 检查 Python 3（必需）
python3 --version

# 检查网络工具（wget 或 curl，必需）
which wget curl

# 检查磁盘空间（推荐 10GB 可用）
df -h /workspaces
```

### 步骤 2：下载数据集

#### 选项 A：VoiceBank+DEMAND（推荐入门）

```bash
# 创建下载目录
mkdir -p ~/audio-data/voicebank
cd ~/audio-data/voicebank

# 下载（~2GB）
wget https://datashare.ed.ac.uk/bitstream/handle/10283/2791/voicebank_demand.zip

# 或使用 curl（如果 wget 不可用）
curl -L -o voicebank_demand.zip \
  https://datashare.ed.ac.uk/bitstream/handle/10283/2791/voicebank_demand.zip

# 解压
unzip voicebank_demand.zip  # 预计 2–3 分钟

# 验证结构
ls -la voicebank_demand/
# 应显示：clean_trainset, noisy_trainset, clean_testset, noisy_testset, noise
```

#### 选项 B：DNS Challenge Generic Test Set（高级）

```bash
mkdir -p ~/audio-data/dns
cd ~/audio-data/dns

# 从 GitHub Releases 下载（~1.5GB，比较稳定）
# 方法 1：wget
wget https://github.com/microsoft/DNS-Challenge/releases/download/generic_test_set/generic_test_set.tar.gz

# 方法 2：curl
curl -L -o generic_test_set.tar.gz \
  https://github.com/microsoft/DNS-Challenge/releases/download/generic_test_set/generic_test_set.tar.gz

# 解压
tar -xzf generic_test_set.tar.gz  # 预计 1–2 分钟

# 验证
ls -la generic_test_set/
# 应显示：test_set_synthetic, clean（或多个目录）
```

#### 选项 C：LibriSpeech（干净语音库）✨ 可选扩展

如果想添加自定义噪声混合，下载干净语音库：

```bash
mkdir -p ~/audio-data/librispeech
cd ~/audio-data/librispeech

# 下载测试集（~600MB，推荐）
wget http://www.openslr.org/resources/12/test-clean.tar.gz

# 解压
tar -xzf test-clean.tar.gz  # 预计 1 分钟

# 完整训练集（可选，500+ GB）
# wget http://www.openslr.org/resources/12/train-other-500.tar.gz
```

### 步骤 3：集成到 HearClear

#### 使用 Python 脚本（推荐，自动化）

```bash
cd /workspaces/HearClear

# VoiceBank 集成
python3 scripts/data-preparation/prepare_datasets.py \
  --dataset voicebank \
  --source-dir ~/audio-data/voicebank/voicebank_demand \
  --output-dir . \
  --pairs 114

# 结果：
# ✅ Generated test-data/audio-regression/manifest.json with 114 pairs
```

#### 或：DNS Challenge 集成

```bash
python3 scripts/data-preparation/prepare_datasets.py \
  --dataset dns \
  --source-dir ~/audio-data/dns/generic_test_set \
  --output-dir . \
  --pairs 150
```

#### 或：合并两个数据集

```bash
# 先准备 DNS（150 对）
python3 scripts/data-preparation/prepare_datasets.py \
  --dataset dns \
  --source-dir ~/audio-data/dns/generic_test_set \
  --output-dir . \
  --pairs 150

# 再合并 VoiceBank（114 对）
python3 scripts/data-preparation/prepare_datasets.py \
  --dataset voicebank \
  --source-dir ~/audio-data/voicebank/voicebank_demand \
  --output-dir . \
  --pairs 114 \
  --merge

# 结果：总共 264 对音频
```

#### 手动方式（如果脚本出错）

```bash
cd /workspaces/HearClear/test-data/audio-regression/samples

# 创建软链接（对于 VoiceBank）
for f in ~/audio-data/voicebank/voicebank_demand/noisy_testset/*.wav; do
  ln -s "$f" noisy/$(basename "$f")
done

for f in ~/audio-data/voicebank/voicebank_demand/clean_testset/*.wav; do
  ln -s "$f" clean/$(basename "$f")
done

# 验证
ls noisy/ | wc -l  # 应显示配对数量
ls clean/ | wc -l
```

### 步骤 4：验证设置

#### 检查 manifest.json

```bash
cd /workspaces/HearClear

# 验证文件存在
test -f test-data/audio-regression/manifest.json && \
  echo "✓ manifest.json 存在"

# 查看条目数
jq '.total_pairs' test-data/audio-regression/manifest.json

# 查看样本条目
jq '.pairs[0:3]' test-data/audio-regression/manifest.json
```

#### 检查音频文件

```bash
# 统计文件
ls test-data/audio-regression/samples/noisy/ | wc -l
ls test-data/audio-regression/samples/clean/ | wc -l

# 验证一个音频文件
ffprobe test-data/audio-regression/samples/noisy/001.wav 2>&1 | grep -E "Duration|Sample rate"

# 或使用 sox（如果可用）
soxi test-data/audio-regression/samples/noisy/001.wav
```

### 步骤 5：运行回归测试

```bash
cd /workspaces/HearClear

# 执行音频回归测试
npm run test:audio-regression

# 或直接运行脚本
node scripts/audio-regression/run.mjs
```

**预期输出**：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Audio Regression Test Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Processed 114 pairs
  - Valid pairs: 114
  - Avg correlation: 0.82
  - Avg SNR improvement: 12.3 dB

📁 Report saved: test-data/audio-regression/reports/report-<timestamp>.json
```

### 步骤 6：保存基线（用于后续对比）

```bash
# 复制最新报告为基线
cp test-data/audio-regression/reports/report-*.json \
   test-data/audio-regression/reports/baseline.json

# 或手动指定最新的报告
ls test-data/audio-regression/reports/ | sort -r | head -1
cp "test-data/audio-regression/reports/$(ls test-data/audio-regression/reports/ | sort -r | head -1)" \
   test-data/audio-regression/reports/baseline.json

echo "✓ Baseline saved"
```

---

## 📊 期望的数据结构

完成后应有以下结构：

```
/workspaces/HearClear/
├── test-data/
│   └── audio-regression/
│       ├── README.md
│       ├── manifest.json                    # ✨ 自动生成
│       ├── samples/
│       │   ├── noisy/                      # ✨ WAV 文件（001.wav 到 NNN.wav）
│       │   │   ├── 001.wav
│       │   │   ├── 002.wav
│       │   │   └── ... (100-264 对)
│       │   └── clean/                      # ✨ 对应的干净版本
│       │       ├── 001.wav
│       │       ├── 002.wav
│       │       └── ...
│       ├── reports/                        # ✨ 测试结果
│       │   ├── baseline.json               # 保存的基线
│       │   └── report-2024-01-15-...json  # 最新报告
│       └── baseline.json (可选)
└── docs/
    └── AUDIO_DATASETS_GUIDE.md            # 本指南

~/audio-data/                              # 外部下载的源数据（可删除以节省空间）
├── voicebank/voicebank_demand/
├── dns/generic_test_set/
└── librispeech/LibriSpeech/ (可选)
```

---

## 🛠️ 常见问题和解决方案

### 问题 1：下载速度太慢

**解决方案**：
- 使用 Aria2：`aria2c -x 16 <url>`
- 或在凌晨时段下载（网络较空闲）
- 或从镜像站下载（如果可用）

### 问题 2：解压失败

```bash
# 如果 unzip 失败，尝试：
python3 -m zipfile -e voicebank_demand.zip voicebank_demand/

# 或 tar 解压失败：
tar -xzf generic_test_set.tar.gz --verbose
```

### 问题 3：脚本找不到音频文件

**检查步骤**：
```bash
# 1. 验证源目录结构
ls ~/audio-data/voicebank/voicebank_demand/
# 应包含 noisy_testset/、clean_testset/

# 2. 检查文件
ls ~/audio-data/voicebank/voicebank_demand/noisy_testset/ | head -5

# 3. 重新运行脚本时指定正确的路径
python3 scripts/data-preparation/prepare_datasets.py \
  --dataset voicebank \
  --source-dir ~/audio-data/voicebank/voicebank_demand \
  --pairs 20  # 先测试少量
```

### 问题 4：运行 test:audio-regression 失败

```bash
# 1. 检查 manifest.json 格式
jq . test-data/audio-regression/manifest.json

# 2. 检查音频文件完整性
ls test-data/audio-regression/samples/noisy/ | wc -l
ls test-data/audio-regression/samples/clean/ | wc -l

# 3. 查看脚本日志
node scripts/audio-regression/run.mjs 2>&1 | head -50

# 4. 重新运行数据准备
rm test-data/audio-regression/manifest.json
python3 scripts/data-preparation/prepare_datasets.py --dataset voicebank --source-dir ~/audio-data/voicebank/voicebank_demand --pairs 10
```

### 问题 5：磁盘空间不足

```bash
# 检查磁盘使用
du -sh ~/audio-data/*
du -sh /workspaces/HearClear/test-data/

# 节省空间：删除原始文件，保留已集成的
rm -rf ~/audio-data/dns/generic_test_set/
# （保留 manifest.json 和 samples/ 目录即可）
```

---

## 🧪 测试覆盖范围

使用本指南集成后，将获得：

| 指标 | VoiceBank Only | DNS + VoiceBank | 自定义 |
|------|----------------|-----------------|--------|
| **配对数** | 114 对 | 260+ 对 | 自定义 |
| **噪声类型** | 10 种 | 50+ 种 | 自定义 |
| **SNR 范围** | 0–20 dB | 0–40 dB | 自定义 |
| **说话者数** | 28 人 | 100+ 人 | 自定义 |
| **采样率** | 16 kHz | 16/48 kHz | 自定义 |

---

## 📈 监控和持续测试

### 每次算法更新后

```bash
# 1. 运行回归测试
npm run test:audio-regression

# 2. 对比结果（与基线）
node scripts/audio-regression/compare-reports.mjs \
  test-data/audio-regression/reports/baseline.json

# 3. 如果改进，更新基线
cp test-data/audio-regression/reports/report-latest.json \
   test-data/audio-regression/reports/baseline.json
```

### 生成可视化报告

```bash
# 使用自定义脚本（可选）
python3 scripts/audio-regression/visualize_results.py \
  test-data/audio-regression/reports/baseline.json \
  --output tests-report.html
```

---

## 📦 集成到 CI/CD

在 GitHub Actions 或其他 CI 系统中：

```yaml
# 示例：.github/workflows/audio-regression.yml
name: Audio Regression Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      # 缓存已下载的数据集（可选）
      - name: Cache audio-data
        uses: actions/cache@v3
        with:
          path: ~/audio-data/
          key: audio-datasets-${{ hashFiles('test-data/audio-regression/manifest.json') }}
      
      - name: Run audio regression tests
        run: npm run test:audio-regression
      
      - name: Compare with baseline
        run: |
          node scripts/audio-regression/compare-reports.mjs \
            test-data/audio-regression/reports/baseline.json || true
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: audio-regression-reports
          path: test-data/audio-regression/reports/
```

---

## 📚 相关文档

- [AUDIO_DATASETS_GUIDE.md](./AUDIO_DATASETS_GUIDE.md) - 详细的数据集信息
- [audio-regression-test.md](./audio-regression-test.md) - 测试框架细节
- [noise-reduction-and-vad-research.md](./noise-reduction-and-vad-research.md) - 降噪算法研究
- [TEST_REPORT.md](../TEST_REPORT.md) - 当前测试结果

---

## ✅ 完成检查表

- [ ] 环境检查完成（Python 3 + wget/curl）
- [ ] 数据集下载完成
- [ ] 数据集集成完成
- [ ] manifest.json 生成成功
- [ ] 音频文件验证通过
- [ ] 回归测试运行成功
- [ ] 基线报告保存

完成上列所有项后，HearClear 的音频测试基础设施就已完全准备好！🎉

---

## 🆘 获取帮助

如遇到问题：

1. **检查日志**：
   ```bash
   tail -f test-data/audio-regression/reports/report-*.json
   ```

2. **查看脚本文档**：
   ```bash
   python3 scripts/data-preparation/prepare_datasets.py --help
   ```

3. **提问或报告 Issue**：
   - 描述操作步骤
   - 提供错误消息
   - 包含运行环境（OS、Python版本、磁盘空间）

祝你使用愉快！🎵

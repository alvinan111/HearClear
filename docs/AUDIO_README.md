# 📚 音频数据集和降噪测试 - 文档导航

> 为 HearClear 降噪功能准备完整的开源音频数据集和测试基础设施

## 🎯 选择你的起点

### 😊 我是新手，只想快速开始

**→ 阅读**: [快速启动](#快速启动5-分钟)  
**→ 执行**: 一个命令  
**预计时间**: 5 分钟阅读 + 15–30 分钟运行

```bash
bash scripts/setup-audio-datasets.sh --quick-start
```

### 👨‍💻 我是开发者，要完整的解决方案

**→ 阅读**: [实施指南](AUDIO_DATASET_SETUP_GUIDE.md)  
**→ 查看**: [数据集对比表](AUDIO_DATASETS_GUIDE.md#-数据集速查表)  
**预计时间**: 30 分钟阅读 + 1 小时执行

### 🔬 我是研究者，需要详细的数据集信息

**→ 阅读**: [完整数据集指南](AUDIO_DATASETS_GUIDE.md)  
**→ 参考**: 许可证、统计信息、论文出处  
**预计时间**: 2 小时深度阅读

### 🏗️ 我要维护这个项目，需要了解完整的架构

**→ 阅读**: [路线图和架构](AUDIO_TESTING_ROADMAP.md)  
**→ 查看**: [集成方式对比](#-完整功能对比)  
**预计时间**: 1 小时全面了解

---

## 📋 文档一览表

### 核心文档

| 文档 | 用途 | 阅读时间 | 何时看 |
|------|------|---------|--------|
| **[AUDIO_DATASETS_GUIDE.md](AUDIO_DATASETS_GUIDE.md)** | 📊 10 个数据集的完整对比、下载链接、许可证 | 45 min | 想选择合适的数据集时 |
| **[AUDIO_DATASET_SETUP_GUIDE.md](AUDIO_DATASET_SETUP_GUIDE.md)** | 📖 分步集成指南，包括故障排查 | 30 min | 准备集成数据集时 ⭐ |
| **[AUDIO_TESTING_ROADMAP.md](AUDIO_TESTING_ROADMAP.md)** | 🎯 项目计划、实施清单、场景案例 | 20 min | 了解全貌和后续计划时 |

### 脚本和工具

| 脚本 | 用途 | 何时用 |
|------|------|--------|
| **[scripts/setup-audio-datasets.sh](../scripts/setup-audio-datasets.sh)** | 🤖 一键下载、集成、验证 | 第一次集成数据集 |
| **[scripts/data-preparation/prepare_datasets.py](../scripts/data-preparation/prepare_datasets.py)** | 🔧 Python 数据集转换器 | 手动集成或扩展 |

### 配置和数据

| 文件 | 用途 | 说明 |
|------|------|------|
| **test-data/audio-regression/manifest.json** | 📝 数据清单 | 自动生成（无需手动编辑） |
| **test-data/audio-regression/samples/** | 🎵 实际音频文件 | 通过脚本自动填充 |
| **test-data/audio-regression/reports/** | 📊 测试结果 | 每次测试后自动生成 |

---

## 🚀 快速启动（5 分钟）

> 如果你只想快速开始，按照这步执行

### 步骤 1：确认环境 (1 分钟)

```bash
# 检查 Python 3
python3 --version  # 需要 3.7+

# 检查网络工具
which wget curl  # 至少有一个

# 检查磁盘空间
df -h /workspaces  # 推荐 10GB 可用
```

### 步骤 2：执行一键设置 (2–30 分钟)

```bash
cd /workspaces/HearClear

# 快速方案（推荐）：仅 VoiceBank，~2GB，15–30 分钟
bash scripts/setup-audio-datasets.sh --quick-start

# 或完整方案（可选）：DNS + VoiceBank，~5GB，45–60 分钟
bash scripts/setup-audio-datasets.sh --full
```

### 步骤 3：验证 (1 分钟)

```bash
# 检查 manifest
jq '.total_pairs' test-data/audio-regression/manifest.json

# 运行测试
npm run test:audio-regression

# 查看结果
cat test-data/audio-regression/reports/report-latest.json | jq '.summary'
```

**预期结果**：
- ✓ manifest.json 包含 100+ 条记录
- ✓ samples/noisy 和 samples/clean 各有同等数量的 WAV 文件
- ✓ 测试输出显示 `avg_correlation_output > 0.75`

---

## 🎯 完整功能对比

选择最适合你的方案：

### 方案 A：快速入门 (⚡ 推荐新手)

```bash
bash scripts/setup-audio-datasets.sh --quick-start
```

| 项目 | 规格 |
|------|------|
| **下载数据** | VoiceBank+DEMAND 仅 |
| **文件大小** | ~2 GB |
| **时间** | 15–30 分钟 |
| **配对数** | 114 对 |
| **噪声类型** | 10 种 |
| **许可证** | CC-BY-4.0 ✅ 完全开放 |
| **适用场景** | 快速验证、小规模测试 |

### 方案 B：完整推荐 (⭐ 生产级)

```bash
bash scripts/setup-audio-datasets.sh --full
```

| 项目 | 规格 |
|------|------|
| **下载数据** | DNS Challenge + VoiceBank |
| **文件大小** | ~5 GB |
| **时间** | 45–60 分钟 |
| **配对数** | 200+ 对 |
| **噪声类型** | 50+ 种 |
| **许可证** | 混合（建议只用 VoiceBank 部分用于商业） |
| **适用场景** | 开源发布、论文、全面评估 |

### 方案 C：手动精细 (🎛️ 高级用户)

```bash
# 手动下载和集成，完全控制
python3 scripts/data-preparation/prepare_datasets.py \
  --dataset voicebank \
  --source-dir ~/your-data-path \
  --pairs 100
```

| 项目 | 规格 |
|------|------|
| **灵活性** | 完全自定义 |
| **文件大小** | 自定义 |
| **时间** | 1–2 小时 |
| **配对数** | 自定义 |
| **噪声类型** | 自定义 |
| **适用场景** | 特殊需求、多数据集组合 |

---

## 📖 按阅读深度分类

### 📱 5 分钟速览

想快速了解这是什么？

1. 读本文 (2 min) ← **现在读这个**
2. 看 [AUDIO_TESTING_ROADMAP.md](AUDIO_TESTING_ROADMAP.md) 的概览部分 (3 min)
3. 执行 `bash scripts/setup-audio-datasets.sh --quick-start`

### 📖 30 分钟深入

想理解原理和实施细节？

1. 本文完整版 (5 min)
2. [AUDIO_DATASET_SETUP_GUIDE.md](AUDIO_DATASET_SETUP_GUIDE.md) 的核心步骤 (15 min)
3. [AUDIO_DATASETS_GUIDE.md](AUDIO_DATASETS_GUIDE.md) 的快速参考表 (10 min)
4. 执行设置并观察日志

### 📚 2 小时精深

想完全掌握所有细节？

1. 完整阅读 [AUDIO_DATASETS_GUIDE.md](AUDIO_DATASETS_GUIDE.md) (1 h)
2. 完整阅读 [AUDIO_DATASET_SETUP_GUIDE.md](AUDIO_DATASET_SETUP_GUIDE.md) (30 min)
3. 查看脚本源代码 (20 min)
4. 执行手动方案并记笔记

---

## 🔍 按任务分类

### 任务 1：快速集成数据集

**目标**：30 分钟内将 100+ 对音频集成到项目

**步骤**：
1. 运行 `bash scripts/setup-audio-datasets.sh --quick-start`
2. 等待完成
3. 验证 `npm run test:audio-regression`

**相关文档**：[AUDIO_DATASET_SETUP_GUIDE.md§快速开始](AUDIO_DATASET_SETUP_GUIDE.md)

### 任务 2：选择最合适的数据集

**目标**：了解不同数据集的优劣，做出最优选择

**步骤**：
1. 查看 [AUDIO_DATASETS_GUIDE.md§数据集速查表](AUDIO_DATASETS_GUIDE.md#-数据集速查表)
2. 对比 3 个推荐数据集：DNS, VoiceBank, MS-SNSD
3. 根据许可证、时间、计算资源做决策

**相关文档**：[AUDIO_DATASETS_GUIDE.md](AUDIO_DATASETS_GUIDE.md)

### 任务 3：从零手动集成

**目标**：完全理解和控制集成过程

**步骤**：
1. 阅读 [AUDIO_DATASET_SETUP_GUIDE.md§详细步骤](AUDIO_DATASET_SETUP_GUIDE.md#-详细步骤)
2. 按第 1–5 步逐个执行（跳过自动化脚本）
3. 手动运行转换脚本
4. 验证和调试

**相关文档**：[AUDIO_DATASET_SETUP_GUIDE.md](AUDIO_DATASET_SETUP_GUIDE.md)

### 任务 4：故障排查

**目标**：解决集成或测试中的问题

**步骤**：
1. 查看 [AUDIO_DATASET_SETUP_GUIDE.md§常见问题](AUDIO_DATASET_SETUP_GUIDE.md#-常见问题和解决方案)
2. 按症状查找解决方案
3. 按指导重新执行

**相关文档**：[AUDIO_DATASET_SETUP_GUIDE.md](AUDIO_DATASET_SETUP_GUIDE.md)

### 任务 5：集成到 CI/CD

**目标**：让 GitHub Actions 自动运行音频测试

**步骤**：
1. 查看 [AUDIO_TESTING_ROADMAP.md§集成到 GitHub](AUDIO_TESTING_ROADMAP.md#-集成到-github--文档)
2. 复制 `.github/workflows/audio-regression.yml` 配置
3. 提交到 GitHub

**相关文档**：[AUDIO_DATASET_SETUP_GUIDE.md§CI/CD](AUDIO_DATASET_SETUP_GUIDE.md#-集成到-cicd)

---

## 🎓 学习路径

### 路径 A：我只想让它工作 (⚡ 最快)

```
1. 本页面的"快速启动"部分
2. 运行 setup-audio-datasets.sh --quick-start
3. 完成！
```

### 路径 B：我想理解工作原理 (📖 标准)

```
1. 本页面完整版 (5 min)
2. AUDIO_DATASET_SETUP_GUIDE.md (30 min)
3. 运行设置脚本 (30 min)
4. 阅读测试框架文档 (15 min)
5. 完成！
```

### 路径 C：我要深入学习 (📚 专业)

```
1. 本页面完整版 (5 min)
2. AUDIO_DATASETS_GUIDE.md (1 h)
3. AUDIO_DATASET_SETUP_GUIDE.md (45 min)
4. AUDIO_TESTING_ROADMAP.md (30 min)
5. 查看脚本源代码 (1 h)
6. 手动执行一次完整流程 (2 h)
7. 完成！
```

---

## ✅ 完成检查清单

使用工作时：

- [ ] **第 1 天**
  - [ ] 选择数据集方案
  - [ ] 运行 setup 脚本
  - [ ] 等待完成
  
- [ ] **第 2 天**
  - [ ] 验证 manifest.json
  - [ ] 运行 `npm run test:audio-regression`
  - [ ] 查看报告

- [ ] **第 3 天**
  - [ ] 保存基线
  - [ ] 更新项目文档
  - [ ] 完成！

---

## 📞 快速问题解答

**Q: 我完全不懂音频处理，能用吗？**  
A: 可以！只需运行一个命令。所有复杂的工作脚本已自动化。

**Q: 我没有很多时间，怎么办？**  
A: 选择快速方案 (--quick-start)，15–30 分钟搞定。

**Q: 我害怕损坏项目，安全吗？**  
A: 完全安全！所有文件都在 `test-data/` 目录，不会影响源代码。

**Q: 我需要自定义数据集，怎么做？**  
A: 查看 [任务 3：从零手动集成](#任务-3从零手动集成)

**Q: 将来如何更新数据集？**  
A: 查看 [AUDIO_DATASET_SETUP_GUIDE.md§监控和持续测试](AUDIO_DATASET_SETUP_GUIDE.md#-监控和持续测试)

---

## 🎯 下一步行动

### 立即开始（现在）

```bash
cd /workspaces/HearClear
bash scripts/setup-audio-datasets.sh --quick-start
```

### 如遇问题

1. 查看本页面上的"快速问题解答"
2. 查看 [AUDIO_DATASET_SETUP_GUIDE.md§常见问题](AUDIO_DATASET_SETUP_GUIDE.md#-常见问题和解决方案)
3. 检查脚本日志和错误消息

### 完成后

1. 保存 `test-data/audio-regression/reports/baseline.json`
2. 更新 GitHub README
3. 在 CI/CD 中启用自动化测试
4. 发布！🚀

---

## 📚 文档清单

按推荐阅读顺序：

1. ✅ **本文** (README) — 快速导航和概览
2. 📋 [AUDIO_DATASET_SETUP_GUIDE.md](AUDIO_DATASET_SETUP_GUIDE.md) — 详细集成指南
3. 📊 [AUDIO_DATASETS_GUIDE.md](AUDIO_DATASETS_GUIDE.md) — 数据集详解
4. 🎯 [AUDIO_TESTING_ROADMAP.md](AUDIO_TESTING_ROADMAP.md) — 项目规划和场景
5. 📖 [audio-regression-test.md](audio-regression-test.md) — 测试框架文档
6. 🔬 [noise-reduction-and-vad-research.md](noise-reduction-and-vad-research.md) — 算法研究

---

## 🏆 成功标志

完成后你将看到：

✅ 100+ 对音频文件在 `test-data/audio-regression/samples/`  
✅ `manifest.json` 包含完整的数据清单  
✅ 运行 `npm run test:audio-regression` 显示绿色成功消息  
✅ `test-data/audio-regression/reports/baseline.json` 包含量化的性能指标  
✅ 所有降噪效果指标 > 目标值

**恭喜！你的 HearClear 降噪测试基础设施已就绪！** 🎉

---

**最后一句话**：如果你只做一件事，运行这个：

```bash
bash scripts/setup-audio-datasets.sh --quick-start
```

其他一切都会自动完成。15–30 分钟后，你会有一个完整的、可验证的音频测试框架。

祝你使用愉快！🎵

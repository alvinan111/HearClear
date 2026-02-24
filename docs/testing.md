# 测试说明与覆盖范围

## 当前覆盖

| 区域 | 文件 | 说明 |
|------|------|------|
| 音频配置 | `src/__tests__/config/audio.test.ts` | AUDIO_CONFIG 范围、EQ_BANDS、FEEDBACK_SUPPRESSOR、AUDIO_PRESETS、HeadphoneMode |
| 音频引擎 | `src/__tests__/services/audio-engine.test.ts` | Mock 下 start/stop、getSpectrumData 返回 null、幂等 |
| 音频 store | `src/__tests__/stores/audio-store.test.ts` | 初始状态、updateParams/resetParams、configLocked、headphoneMode、noiseGate/voiceEnhance |
| 其他 | auth、api、subscription、config-store、storage、date、db/schema | 见 `src/__tests__/` |

## 覆盖不足与建议

- **useAudioAnalyser**：依赖 `status`、`AudioEngine.getSpectrumData`、`useRealAudioLevel`，需 `renderHook` 或组件挂载测试；当前无单测，建议手动验证「运行中双频谱有数据、停止后归零」。
- **首页 UI**：滑块、双频谱、设备选择、无耳机提示等，建议通过 E2E 或真机回归（见 `docs/recent-changes.md` 清单）。
- **AudioEngine 真实逻辑**：getSpectrumData 非 null 时的返回形状、extractBars 边界，依赖 native，仅在 Dev Build 下可验证；单测仅保证 Mock 下行为与文档约定。

## 运行测试

```bash
npm test
npm run test:coverage
```

## 人声降噪自测（选做）

用于在**固定测试集**或**自备带噪音频**上对比不同降噪/人声增强方案，用 PESQ/STOI 选出最佳方案。

- **脚本与用法**：见 [scripts/denoising-self-test/README.md](../scripts/denoising-self-test/README.md)。
- **测试集**：VoiceBank-DEMAND（Hugging Face，`--source voicebank`）、或本地 `--noisy` / `--clean` 配对。
- **无参考时**：使用 `--noisy 带噪.wav --reference-from-separation`，脚本会用人声分离模型（如 Demucs）从带噪音频中分离出人声轨作为参考，再对增强结果算 PESQ/STOI。
- **运行示例**：
  ```bash
  pip install -r scripts/denoising-self-test/requirements.txt
  python scripts/denoising-self-test/run_self_test.py --source voicebank
  ```
  输出各方案 PESQ/STOI 表格，便于确定最佳方案。

---

## 回归清单

发布前建议跑通：`npm test`，并对照 `docs/recent-changes.md` 做一次手动回归。

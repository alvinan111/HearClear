#!/usr/bin/env python3
"""
人声降噪自测：在测试集或自备音频上对比多种增强方案，输出 PESQ/STOI，便于选出最佳方案。

测试集：VoiceBank-DEMAND（Hugging Face）或本地 noisy+clean 配对；
若无参考，可用 --reference-from-separation 用人声分离模型（如 Demucs）生成参考。
"""

from __future__ import annotations

import argparse
import io
import os
import subprocess
import sys
import tempfile
from pathlib import Path

# 可选依赖
try:
    import numpy as np
    import soundfile as sf
except ImportError:
    print("请安装: pip install -r scripts/denoising-self-test/requirements.txt", file=sys.stderr)
    sys.exit(1)

try:
    from pesq import pesq as pesq_fn
except ImportError:
    pesq_fn = None
try:
    from pystoi import stoi
except ImportError:
    stoi = None

SR = 16000  # 评测统一 16kHz


def load_wav(path: str | Path) -> tuple[np.ndarray, int]:
    data, rate = sf.read(path, dtype="float32")
    if data.ndim > 1:
        data = data.mean(axis=1)
    if rate != SR:
        from scipy import signal
        data = signal.resample(data, int(len(data) * SR / rate))
    return data.astype("float32"), SR


def save_wav(path: str | Path, data: np.ndarray, sr: int = SR) -> None:
    sf.write(path, data, sr)


def pesq_score(enhanced: np.ndarray, reference: np.ndarray, sr: int = SR) -> float | None:
    if pesq_fn is None:
        return None
    # PESQ 需要 16k 或 8k
    if sr != 16000:
        from scipy import signal
        enhanced = signal.resample(enhanced, int(len(enhanced) * 16000 / sr))
        reference = signal.resample(reference, int(len(reference) * 16000 / sr))
        sr = 16000
    min_len = min(len(enhanced), len(reference))
    try:
        return pesq_fn(16000, reference[:min_len], enhanced[:min_len], "wb")
    except Exception:
        return None


def stoi_score(enhanced: np.ndarray, reference: np.ndarray, sr: int = SR) -> float | None:
    if stoi is None:
        return None
    min_len = min(len(enhanced), len(reference))
    try:
        return stoi(reference[:min_len], enhanced[:min_len], sr, extended=False)
    except Exception:
        return None


def _audio_dict_to_array(a, sr_target: int = SR) -> tuple[np.ndarray | None, int]:
    """把 Audio 列的一项（decode=False 时的 dict 或已解码的 array）转为 (array, sr)。"""
    if a is None:
        return None, sr_target
    if isinstance(a, dict):
        if "array" in a:
            arr = np.array(a["array"], dtype="float32")
            sr = int(a.get("sampling_rate", sr_target))
        elif "bytes" in a and a["bytes"] is not None:
            data, sr = sf.read(io.BytesIO(a["bytes"]), dtype="float32")
            arr = data.mean(axis=1).astype("float32") if data.ndim > 1 else data.astype("float32")
        elif "path" in a and a["path"]:
            arr, sr = load_wav(a["path"])
        else:
            return None, sr_target
    else:
        arr = np.array(a, dtype="float32")
        sr = sr_target
    if arr.ndim > 1:
        arr = arr.mean(axis=1)
    if sr != sr_target:
        from scipy import signal
        arr = signal.resample(arr, int(len(arr) * sr_target / sr)).astype("float32")
    return arr, sr_target


def get_voicebank_pair(max_samples: int = 3) -> list[tuple[np.ndarray, np.ndarray, int]]:
    """从 Hugging Face VoiceBank-DEMAND-16k 取若干条 test 配对。不依赖 torchcodec，从 Arrow 取 path/bytes 后用 soundfile 解码。"""
    try:
        from datasets import load_dataset
    except ImportError:
        print("VoiceBank 需要: pip install datasets（建议 Python 3.8+）", file=sys.stderr)
        return []
    ds = load_dataset("JacobLinCool/VoiceBank-DEMAND-16k", split="test", trust_remote_code=True)
    table = ds.data
    clean_col = next((c for c in ("clean", "clean_speech", "speech") if c in ds.column_names), None)
    noisy_col = next((c for c in ("noisy", "noisy_speech", "audio") if c in ds.column_names), None)
    if not clean_col or not noisy_col:
        return []
    out = []
    for i in range(min(max_samples, len(ds))):
        clean_cell = table.column(clean_col)[i]
        noisy_cell = table.column(noisy_col)[i]
        clean_raw = clean_cell.as_py() if hasattr(clean_cell, "as_py") else clean_cell
        noisy_raw = noisy_cell.as_py() if hasattr(noisy_cell, "as_py") else noisy_cell
        clean, sr = _audio_dict_to_array(clean_raw)
        noisy, _ = _audio_dict_to_array(noisy_raw, sr_target=sr)
        if clean is not None and noisy is not None:
            min_len = min(len(clean), len(noisy))
            out.append((noisy[:min_len], clean[:min_len], sr))
    return out


def reference_from_separation(noisy_path: str | Path, out_ref_path: str | Path) -> bool:
    """用 Demucs 从带噪音频中分离人声，保存为参考。"""
    noisy_path = Path(noisy_path)
    out_ref_path = Path(out_ref_path)
    try:
        import demucs.separate
    except ImportError:
        print("人声分离需要: pip install demucs", file=sys.stderr)
        return False
    out_dir = out_ref_path.parent / "demucs_out"
    out_dir.mkdir(parents=True, exist_ok=True)
    # 使用 htdemucs 或 ht demucs，输出 4 轨：drums, bass, other, vocals
    cmd = [
        sys.executable, "-m", "demucs",
        "-n", "htdemucs",
        "--two-stems", "vocals",
        "-o", str(out_dir),
        str(noisy_path),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if r.returncode != 0:
        print("Demucs 失败:", r.stderr[:500], file=sys.stderr)
        return False
    # 输出在 out_dir/htdemucs/ noisy_path.stem/vocals.wav
    stem_dir = out_dir / "htdemucs" / noisy_path.stem
    vocals = stem_dir / "vocals.wav"
    if not vocals.exists():
        print("未找到 Demucs vocals 输出", file=sys.stderr)
        return False
    ref, sr = load_wav(vocals)
    save_wav(out_ref_path, ref, sr)
    return True


# --------------- 方案：输入 (noisy 数组, sr)，输出 (enhanced 数组, sr) ---------------
def scheme_passthrough(noisy: np.ndarray, sr: int) -> tuple[np.ndarray, int]:
    return noisy.copy(), sr


def scheme_rnnoise_placeholder(noisy: np.ndarray, sr: int) -> tuple[np.ndarray, int]:
    """占位：后续接 RNNoise（需 48k 输入）或子进程调用 rnnoise_demo。"""
    return noisy.copy(), sr


def scheme_sherpa_placeholder(noisy: np.ndarray, sr: int) -> tuple[np.ndarray, int]:
    """占位：后续接 sherpa-onnx 语音增强。"""
    return noisy.copy(), sr


SCHEMES = {
    "passthrough": scheme_passthrough,
    "rnnoise": scheme_rnnoise_placeholder,
    "sherpa": scheme_sherpa_placeholder,
}


def main() -> int:
    ap = argparse.ArgumentParser(description="人声降噪自测：对比多方案 PESQ/STOI")
    ap.add_argument("--source", choices=["voicebank"], help="从 VoiceBank-DEMAND 拉测试条")
    ap.add_argument("--noisy", type=str, help="本地带噪 wav")
    ap.add_argument("--clean", type=str, help="本地干净参考 wav（与 --noisy 配对）")
    ap.add_argument("--reference-from-separation", action="store_true",
                    help="无参考时用 Demucs 从 --noisy 分离人声作参考")
    ap.add_argument("--schemes", type=str, default="passthrough,rnnoise,sherpa",
                    help="逗号分隔方案名，默认 passthrough,rnnoise,sherpa")
    ap.add_argument("--max-samples", type=int, default=3, help="VoiceBank 最多取几条")
    args = ap.parse_args()

    pairs: list[tuple[np.ndarray, np.ndarray, int]] = []
    if args.source == "voicebank":
        pairs = get_voicebank_pair(args.max_samples)
        if not pairs:
            print("未获取到 VoiceBank 配对，请检查 datasets 与网络", file=sys.stderr)
            return 1
    elif args.noisy:
        noisy, sr = load_wav(args.noisy)
        if args.clean:
            ref, _ = load_wav(args.clean)
            min_len = min(len(noisy), len(ref))
            pairs = [(noisy[:min_len], ref[:min_len], sr)]
        elif args.reference_from_separation:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                ref_path = f.name
            save_wav(ref_path, noisy, sr)
            ref_path2 = ref_path.replace(".wav", "_ref.wav")
            if not reference_from_separation(ref_path, ref_path2):
                os.unlink(ref_path)
                return 1
            ref, sr = load_wav(ref_path2)
            min_len = min(len(noisy), len(ref))
            pairs = [(noisy[:min_len], ref[:min_len], sr)]
            os.unlink(ref_path)
            try:
                os.unlink(ref_path2)
            except Exception:
                pass
        else:
            print("请提供 --clean 或 --reference-from-separation", file=sys.stderr)
            return 1
    else:
        ap.print_help()
        return 0

    scheme_names = [s.strip() for s in args.schemes.split(",") if s.strip()]
    for name in scheme_names:
        if name not in SCHEMES:
            print(f"未知方案: {name}，可选: {list(SCHEMES.keys())}", file=sys.stderr)
            return 1

    # 对每条配对、每个方案算 PESQ/STOI
    results: dict[str, list[tuple[float | None, float | None]]] = {n: [] for n in scheme_names}
    for noisy, ref, sr in pairs:
        for name in scheme_names:
            enh, _ = SCHEMES[name](noisy, sr)
            p = pesq_score(enh, ref, sr)
            s = stoi_score(enh, ref, sr)
            results[name].append((p, s))

    # 打印表格
    print("\n--- 人声降噪自测结果 ---")
    print(f"样本数: {len(pairs)}")
    print("方案\t\tPESQ(均)\tSTOI(均)")
    print("-" * 50)
    for name in scheme_names:
        vals = results[name]
        pesq_list = [v[0] for v in vals if v[0] is not None]
        stoi_list = [v[1] for v in vals if v[1] is not None]
        pesq_avg = float(np.nanmean(pesq_list)) if pesq_list else None
        stoi_avg = float(np.nanmean(stoi_list)) if stoi_list else None
        pesq_s = f"{pesq_avg:.3f}" if pesq_avg is not None else "N/A"
        stoi_s = f"{stoi_avg:.3f}" if stoi_avg is not None else "N/A"
        print(f"{name}\t\t{pesq_s}\t\t{stoi_s}")
    print("-" * 50)
    if pesq_fn is None:
        print("(PESQ 未安装: pip install pesq)")
    if stoi is None:
        print("(STOI 未安装: pip install pystoi)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

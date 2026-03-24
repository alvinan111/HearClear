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
import sys
from pathlib import Path
from typing import List, Dict
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def prepare_dns_dataset(source_dir: str, output_dir: str, max_pairs: int = 100) -> List[Dict]:
    """从 DNS Challenge 准备音频对"""
    source_path = Path(source_dir)
    
    # DNS 的多种可能路径结构
    possible_structures = [
        (source_path / "test_set_synthetic" / "with_reverb", "test_set_synthetic" / "clean"),
        (source_path / "test_set_synthetic", source_path / "clean"),
        (source_path / "datasets" / "test_set_synthetic", source_path / "datasets" / "clean"),
    ]
    
    noisy_dir = None
    clean_dir = None
    for noisy_candidate, clean_candidate in possible_structures:
        if noisy_candidate.exists():
            noisy_dir = noisy_candidate
            # 确保 clean_dir 是绝对路径
            if isinstance(clean_candidate, Path):
                clean_dir = clean_candidate
            else:
                clean_dir = source_path / clean_candidate
            break
    
    if not noisy_dir:
        logger.error(f"❌ Cannot find DNS dataset structure in {source_dir}")
        logger.info(f"Expected: test_set_synthetic/with_reverb and clean subdirectories")
        return []
    
    if not clean_dir.exists():
        logger.warning(f"⚠️  Clean directory not found at expected location, checking alternatives...")
        clean_dir = source_path / "clean"
    
    pairs = []
    output_noisy = Path(output_dir) / "test-data" / "audio-regression" / "samples" / "noisy"
    output_clean = Path(output_dir) / "test-data" / "audio-regression" / "samples" / "clean"
    
    logger.info(f"Creating output directories...")
    output_noisy.mkdir(parents=True, exist_ok=True)
    output_clean.mkdir(parents=True, exist_ok=True)
    
    files = sorted(list(noisy_dir.glob("*.wav")))[:max_pairs]
    logger.info(f"Found {len(files)} WAV files in {noisy_dir}")
    
    skipped = 0
    for i, noisy_file in enumerate(files, 1):
        clean_file = clean_dir / noisy_file.name
        
        # 尝试多种命名约定
        if not clean_file.exists():
            clean_file = clean_dir / noisy_file.name.replace("noisy_", "clean_")
        if not clean_file.exists():
            clean_file = clean_dir / noisy_file.name.replace("with_reverb_", "")
        
        if not clean_file.exists():
            logger.debug(f"⚠️  Skipping {noisy_file.name} - no matching clean file")
            skipped += 1
            continue
        
        dst_id = f"{i - skipped:03d}"
        dst_noisy = output_noisy / f"{dst_id}.wav"
        dst_clean = output_clean / f"{dst_id}.wav"
        
        try:
            shutil.copy2(noisy_file, dst_noisy)
            shutil.copy2(clean_file, dst_clean)
            
            pairs.append({
                "id": dst_id,
                "noisy_path": f"samples/noisy/{dst_id}.wav",
                "clean_path": f"samples/clean/{dst_id}.wav",
                "scene": "dns_synthetic",
                "snr_estimate": "unknown",
                "source": noisy_file.name
            })
            
            if i % 20 == 0:
                logger.info(f"  ✓ Processed {i} files...")
        except Exception as e:
            logger.error(f"Error copying {noisy_file.name}: {e}")
    
    logger.info(f"✅ DNS: Prepared {len(pairs)} pairs (skipped {skipped})")
    return pairs

def prepare_voicebank_dataset(source_dir: str, output_dir: str, max_pairs: int = 114) -> List[Dict]:
    """从 VoiceBank+DEMAND 准备音频对"""
    source_path = Path(source_dir)
    
    # 尝试多种路径
    possible_noisy = [
        source_path / "noisy_testset",
        source_path / "noisy_trainset",
        source_path / "noisy",
    ]
    
    possible_clean = [
        source_path / "clean_testset",
        source_path / "clean_trainset",
        source_path / "clean",
    ]
    
    noisy_dir = None
    clean_dir = None
    
    for pd in possible_noisy:
        if pd.exists():
            noisy_dir = pd
            break
    
    for cd in possible_clean:
        if cd.exists():
            clean_dir = cd
            break
    
    if not noisy_dir or not clean_dir:
        logger.error(f"❌ Cannot find VoiceBank dataset structure in {source_dir}")
        logger.info(f"Expected: noisy_testset (or trainset) and clean_testset directories")
        return []
    
    pairs = []
    output_noisy = Path(output_dir) / "test-data" / "audio-regression" / "samples" / "noisy"
    output_clean = Path(output_dir) / "test-data" / "audio-regression" / "samples" / "clean"
    
    logger.info(f"Creating output directories...")
    output_noisy.mkdir(parents=True, exist_ok=True)
    output_clean.mkdir(parents=True, exist_ok=True)
    
    files = sorted(list(noisy_dir.glob("*.wav")))[:max_pairs]
    logger.info(f"Found {len(files)} WAV files in {noisy_dir}")
    
    skipped = 0
    for idx, noisy_file in enumerate(files, 1):
        # VoiceBank 命名规则：使用相同的基名
        base_name = noisy_file.stem
        clean_file = clean_dir / f"{base_name}.wav"
        
        if not clean_file.exists():
            # 清理命名可能有"noisy"前缀
            base_name_clean = base_name.replace("noisy_", "clean_").replace("noisy", "clean")
            clean_file = clean_dir / f"{base_name_clean}.wav"
        
        if not clean_file.exists():
            logger.debug(f"⚠️  Skipping {noisy_file.name} - no matching clean file")
            skipped += 1
            continue
        
        dst_id = f"{idx - skipped:03d}"
        dst_noisy = output_noisy / f"{dst_id}.wav"
        dst_clean = output_clean / f"{dst_id}.wav"
        
        try:
            shutil.copy2(noisy_file, dst_noisy)
            shutil.copy2(clean_file, dst_clean)
            
            # 从文件名提取噪声类型
            noise_type = "unknown"
            for keyword in ["babble", "bus", "car", "cafe", "bus", "train", "street", "subway", "office"]:
                if keyword in noisy_file.name.lower():
                    noise_type = keyword
                    break
            
            pairs.append({
                "id": dst_id,
                "noisy_path": f"samples/noisy/{dst_id}.wav",
                "clean_path": f"samples/clean/{dst_id}.wav",
                "scene": f"voicebank_{noise_type}",
                "snr_estimate": "mixed",
                "source": noisy_file.name
            })
            
            if idx % 20 == 0:
                logger.info(f"  ✓ Processed {idx} files...")
        except Exception as e:
            logger.error(f"Error copying {noisy_file.name}: {e}")
    
    logger.info(f"✅ VoiceBank: Prepared {len(pairs)} pairs (skipped {skipped})")
    return pairs

def prepare_custom_dataset(clean_dir: str, noisy_dir: str, output_dir: str) -> List[Dict]:
    """从自定义目录准备音频对"""
    clean_path = Path(clean_dir)
    noisy_path = Path(noisy_dir)
    
    if not clean_path.exists() or not noisy_path.exists():
        logger.error(f"❌ Clean or noisy directory does not exist")
        return []
    
    pairs = []
    output_noisy = Path(output_dir) / "test-data" / "audio-regression" / "samples" / "noisy"
    output_clean = Path(output_dir) / "test-data" / "audio-regression" / "samples" / "clean"
    
    output_noisy.mkdir(parents=True, exist_ok=True)
    output_clean.mkdir(parents=True, exist_ok=True)
    
    # 获取 noisy 文件并查找对应的 clean
    files = sorted(list(noisy_path.glob("*.wav")))
    logger.info(f"Found {len(files)} custom noisy WAV files")
    
    for i, noisy_file in enumerate(files, 1):
        # 假设相同的文件名可在 clean 目录找到
        clean_file = clean_path / noisy_file.name
        
        if not clean_file.exists():
            logger.debug(f"⚠️  Skipping {noisy_file.name} - no matching clean file")
            continue
        
        dst_id = f"{i:03d}"
        dst_noisy = output_noisy / f"{dst_id}.wav"
        dst_clean = output_clean / f"{dst_id}.wav"
        
        try:
            shutil.copy2(noisy_file, dst_noisy)
            shutil.copy2(clean_file, dst_clean)
            
            pairs.append({
                "id": dst_id,
                "noisy_path": f"samples/noisy/{dst_id}.wav",
                "clean_path": f"samples/clean/{dst_id}.wav",
                "scene": "custom",
                "snr_estimate": "unknown",
                "source": noisy_file.name
            })
        except Exception as e:
            logger.error(f"Error copying {noisy_file.name}: {e}")
    
    logger.info(f"✅ Custom: Prepared {len(pairs)} pairs")
    return pairs

def generate_manifest(pairs: List[Dict], output_file: str):
    """生成 manifest.json"""
    manifest = {
        "version": "1.0",
        "total_pairs": len(pairs),
        "pairs": pairs
    }
    
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    
    logger.info(f"✅ Generated {output_path} with {len(pairs)} pairs")

def merge_manifests(output_dir: str):
    """合并多个 dataset 的 pairs"""
    manifest_path = Path(output_dir) / "test-data" / "audio-regression" / "manifest.json"
    
    if manifest_path.exists():
        with open(manifest_path, 'r') as f:
            existing = json.load(f)
            existing_pairs = existing.get("pairs", [])
            logger.info(f"Found existing manifest with {len(existing_pairs)} pairs")
    else:
        existing_pairs = []
    
    return existing_pairs

def main():
    parser = argparse.ArgumentParser(
        description="Prepare audio datasets for HearClear regression testing",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Prepare DNS Challenge dataset
  python prepare_datasets.py --dataset dns --source-dir ~/data/dns-challenge/generic_test_set --pairs 150

  # Prepare VoiceBank+DEMAND
  python prepare_datasets.py --dataset voicebank --source-dir ~/data/voicebank_demand --pairs 114

  # Prepare custom dataset
  python prepare_datasets.py --dataset custom --clean-dir ./clean --noisy-dir ./noisy
        """
    )
    
    parser.add_argument("--dataset", choices=["dns", "voicebank", "custom"], required=True)
    parser.add_argument("--source-dir", help="Source dataset directory (for dns/voicebank)")
    parser.add_argument("--clean-dir", help="Clean audio directory (for custom)")
    parser.add_argument("--noisy-dir", help="Noisy audio directory (for custom)")
    parser.add_argument("--output-dir", default=".", help="Output root directory")
    parser.add_argument("--pairs", type=int, default=100, help="Number of pairs to prepare")
    parser.add_argument("--merge", action="store_true", help="Merge with existing manifest")
    
    args = parser.parse_args()
    
    pairs = []
    
    try:
        if args.dataset == "dns":
            if not args.source_dir:
                logger.error("--source-dir required for DNS dataset")
                sys.exit(1)
            pairs = prepare_dns_dataset(args.source_dir, args.output_dir, args.pairs)
        
        elif args.dataset == "voicebank":
            if not args.source_dir:
                logger.error("--source-dir required for VoiceBank dataset")
                sys.exit(1)
            pairs = prepare_voicebank_dataset(args.source_dir, args.output_dir, args.pairs)
        
        elif args.dataset == "custom":
            if not args.clean_dir or not args.noisy_dir:
                logger.error("--clean-dir and --noisy-dir required for custom dataset")
                sys.exit(1)
            pairs = prepare_custom_dataset(args.clean_dir, args.noisy_dir, args.output_dir)
        
        if not pairs:
            logger.error("❌ No pairs were prepared!")
            sys.exit(1)
        
        # 如果需要合并，读取现有 manifest
        if args.merge:
            existing_pairs = merge_manifests(args.output_dir)
            all_pairs = existing_pairs + pairs
            
            # 重新编号
            for i, pair in enumerate(all_pairs, 1):
                pair["id"] = f"{i:03d}"
            
            pairs = all_pairs
            logger.info(f"📊 Merged: Total {len(pairs)} pairs")
        
        # 生成 manifest
        manifest_path = Path(args.output_dir) / "test-data" / "audio-regression" / "manifest.json"
        generate_manifest(pairs, str(manifest_path))
        
        logger.info(f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Dataset preparation complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Summary:
  - Total pairs: {len(pairs)}
  - Output directory: {Path(args.output_dir) / 'test-data' / 'audio-regression'}
  - Manifest: {manifest_path}

🧪 Next steps:
  1. Verify the manifest: npm run test:audio-regression
  2. Check the report in: test-data/audio-regression/reports/
  3. Save baseline: cp test-data/audio-regression/reports/report-*.json test-data/audio-regression/reports/baseline.json

📚 Documentation:
  - Dataset guide: docs/AUDIO_DATASETS_GUIDE.md
  - Test details: docs/audio-regression-test.md
        """)
        
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

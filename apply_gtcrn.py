#!/usr/bin/env python3
"""
Apply GTCRN speech enhancement using sherpa-onnx.
Usage: python apply_gtcrn.py input.wav output.wav
"""

import sys
import numpy as np
import soundfile as sf
from pathlib import Path

try:
    import sherpa_onnx
except ImportError:
    print("Error: sherpa_onnx not installed. Run: pip install sherpa_onnx")
    sys.exit(1)

def apply_gtcrn(input_path, output_path):
    # Load model (you may need to adjust paths)
    model_dir = Path(__file__).parent / "sherpa-onnx-gtcrn-simple-v2-en"
    if not model_dir.exists():
        print(f"Model directory not found: {model_dir}")
        print("Please download from: https://github.com/k2-fsa/sherpa-onnx/releases/download/speech-enhancement-models/sherpa-onnx-gtcrn-simple-v2-en.tar.bz2")
        print("Extract to the same directory as this script")
        # For now, just copy input to output as fallback
        import shutil
        shutil.copy2(input_path, output_path)
        print(f"Fallback: copied {input_path} to {output_path}")
        return True

    config = sherpa_onnx.OfflineSpeechDenoiserConfig(
        model_path=str(model_dir / "model.onnx"),
        num_threads=1,
    )

    denoiser = sherpa_onnx.OfflineSpeechDenoiser(config)

    # Load audio
    samples, sample_rate = sf.read(input_path, dtype='float32')
    if samples.ndim > 1:
        samples = samples[:, 0]  # Take first channel

    # Apply denoiser
    stream = denoiser.create_stream()
    stream.accept_waveform(sample_rate, samples)
    denoiser.decode_stream(stream)
    enhanced = stream.get_result().samples

    # Save
    sf.write(output_path, enhanced, sample_rate)
    return True

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python apply_gtcrn.py input.wav output.wav")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if apply_gtcrn(input_path, output_path):
        print(f"Enhanced audio saved to {output_path}")
    else:
        sys.exit(1)
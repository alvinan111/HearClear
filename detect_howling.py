#!/usr/bin/env python3
"""
Howling Detection Script
Detects howling (feedback) in audio files by analyzing frequency spectrum.
"""

import numpy as np
import scipy.signal
import soundfile as sf
import sys
import os

def detect_howling(audio_path, sample_rate=None, threshold_db=10):
    """
    Detect howling in audio file.
    
    Args:
        audio_path: Path to audio file
        sample_rate: Expected sample rate (will resample if different)
        threshold_db: Threshold for detecting peaks above average in howling freq range
    
    Returns:
        dict: Detection results
    """
    # Load audio
    audio, sr = sf.read(audio_path)
    if audio.ndim > 1:
        audio = audio.mean(axis=1)  # Convert to mono
    
    if sample_rate and sr != sample_rate:
        # Resample if needed
        audio = scipy.signal.resample(audio, int(len(audio) * sample_rate / sr))
        sr = sample_rate
    
    # Apply window and FFT
    window = np.hanning(len(audio))
    audio_windowed = audio * window
    
    fft = np.fft.rfft(audio_windowed)
    freqs = np.fft.rfftfreq(len(audio), 1/sr)
    magnitude = np.abs(fft)
    magnitude_db = 20 * np.log10(magnitude + 1e-12)
    
    # Focus on howling frequency range (1kHz - 4kHz)
    mask = (freqs >= 1000) & (freqs <= 4000)
    freqs_howl = freqs[mask]
    mag_howl_db = magnitude_db[mask]
    
    if len(mag_howl_db) == 0:
        return {'has_howling': False, 'reason': 'No frequencies in howling range'}
    
    # Calculate statistics
    mean_db = np.mean(mag_howl_db)
    max_db = np.max(mag_howl_db)
    std_db = np.std(mag_howl_db)
    
    # Detect peaks (values significantly above mean)
    peaks_above_threshold = mag_howl_db > (mean_db + threshold_db)
    num_peaks = np.sum(peaks_above_threshold)
    
    # Howling detection logic - look for narrow peaks
    has_howling = False
    reason = "No howling detected"
    
    if num_peaks > 0:
        peak_indices = np.where(peaks_above_threshold)[0]
        for idx in peak_indices:
            # Check if it's a local maximum with narrow bandwidth
            if idx > 1 and idx < len(mag_howl_db) - 2:
                # Check if it's significantly higher than neighbors
                left_diff = mag_howl_db[idx] - mag_howl_db[idx-1]
                right_diff = mag_howl_db[idx] - mag_howl_db[idx+1]
                if left_diff > 5 and right_diff > 5:  # At least 5dB drop on both sides
                    # Check bandwidth (how many bins above threshold around peak)
                    bandwidth = 1
                    for offset in range(1, 10):  # Check up to 10 bins away
                        if idx - offset >= 0 and mag_howl_db[idx - offset] > (mean_db + threshold_db / 2):
                            bandwidth += 1
                        else:
                            break
                    for offset in range(1, 10):
                        if idx + offset < len(mag_howl_db) and mag_howl_db[idx + offset] > (mean_db + threshold_db / 2):
                            bandwidth += 1
                        else:
                            break
                    
                    if bandwidth <= 5:  # Narrow peak (less than 5 bins wide at half threshold)
                        has_howling = True
                        reason = f"Howling detected at {freqs_howl[idx]:.0f}Hz (narrow peak, bandwidth {bandwidth} bins)"
                        break
    
    return {
        'has_howling': has_howling,
        'reason': reason,
        'sample_rate': sr,
        'duration': len(audio) / sr,
        'howling_freq_range': [1000, 4000],
        'mean_db': mean_db,
        'max_db': max_db,
        'std_db': std_db,
        'num_peaks': num_peaks,
        'threshold_db': threshold_db
    }

def main():
    if len(sys.argv) < 2:
        print("Usage: python detect_howling.py <audio_file>")
        sys.exit(1)
    
    audio_path = sys.argv[1]
    if not os.path.exists(audio_path):
        print(f"Error: File {audio_path} does not exist")
        sys.exit(1)
    
    result = detect_howling(audio_path)
    
    print(f"Audio: {audio_path}")
    print(f"Sample Rate: {result['sample_rate']}Hz")
    print(f"Duration: {result['duration']:.2f}s")
    print(f"Howling Range: {result['howling_freq_range'][0]}-{result['howling_freq_range'][1]}Hz")
    print(f"Mean dB: {result['mean_db']:.1f}")
    print(f"Max dB: {result['max_db']:.1f}")
    print(f"Std dB: {result['std_db']:.1f}")
    print(f"Peaks above threshold: {result['num_peaks']}")
    print(f"Threshold: {result['threshold_db']}dB")
    print(f"Result: {'HOWLING DETECTED' if result['has_howling'] else 'No howling'}")
    print(f"Reason: {result['reason']}")
    
    # Exit with error code if howling detected
    sys.exit(1 if result['has_howling'] else 0)

if __name__ == "__main__":
    main()
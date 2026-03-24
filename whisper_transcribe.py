"""Transcribe an audio file using OpenAI Whisper.
Streams PROGRESS lines to stderr. Final JSON result to stdout.
Usage: python whisper_transcribe.py <audio_path> [model_size]
"""
import sys
import os
import io
import json
import threading
import whisper

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No audio file provided"}))
        sys.exit(1)

    audio_path = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "tiny"

    if not os.path.exists(audio_path):
        print(json.dumps({"error": f"File not found: {audio_path}"}))
        sys.exit(1)

    progress(5, "Loading Whisper model...")
    model = whisper.load_model(model_size)

    progress(12, "Model loaded. Loading audio...")
    audio = whisper.load_audio(audio_path)
    duration = len(audio) / 16000  # 16kHz sample rate
    progress(15, f"Audio loaded ({duration:.0f}s). Detecting language...")

    # Detect language
    audio_segment = whisper.pad_or_trim(audio)
    mel = whisper.log_mel_spectrogram(audio_segment).to(model.device)
    _, probs = model.detect_language(mel)
    detected_lang = max(probs, key=probs.get)
    progress(18, f"Language: {detected_lang}. Transcribing ({duration:.0f}s of audio)...")

    # Capture verbose output from whisper for live progress
    # whisper prints segments to stdout when verbose=True
    # We intercept stdout to parse segment timestamps and report progress
    real_stdout = sys.stdout
    sys.stdout = ProgressInterceptor(real_stdout, duration)

    result = model.transcribe(
        audio_path,
        language="fr",
        fp16=False,
        verbose=True
    )

    # Restore stdout
    sys.stdout = real_stdout

    progress(98, "Finalizing...")

    text = result.get("text", "").strip()
    segments = len(result.get("segments", []))
    print(json.dumps({"text": text, "language": detected_lang, "segments": segments}))


class ProgressInterceptor(io.TextIOBase):
    """Intercepts whisper's verbose stdout to extract segment progress."""

    def __init__(self, real_stdout, duration):
        self.real_stdout = real_stdout
        self.duration = max(duration, 1)
        self.last_pct = 18

    def write(self, text):
        # whisper verbose output looks like:
        # [00:00.000 --> 00:04.000]  Bonjour, comment allez-vous?
        if "-->" in text:
            try:
                # Extract end timestamp
                arrow_pos = text.index("-->")
                end_str = text[arrow_pos + 4:].strip()
                bracket_end = end_str.index("]")
                time_str = end_str[:bracket_end].strip()
                parts = time_str.split(":")
                if len(parts) == 2:
                    mins, secs = float(parts[0]), float(parts[1])
                    current_time = mins * 60 + secs
                    raw_pct = current_time / self.duration
                    # Map to 20-95% range
                    pct = int(20 + raw_pct * 75)
                    pct = max(self.last_pct, min(pct, 95))
                    self.last_pct = pct
                    segment_text = text.split("]", 1)[-1].strip()[:60]
                    progress(pct, f"Transcribing... {pct}% [{time_str}] {segment_text}")
            except (ValueError, IndexError):
                pass
        return len(text)

    def flush(self):
        pass


def progress(pct, message):
    sys.stderr.write(f"PROGRESS:{pct}:{message}\n")
    sys.stderr.flush()


if __name__ == "__main__":
    main()

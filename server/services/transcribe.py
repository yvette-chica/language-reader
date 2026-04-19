import sys
import json
from faster_whisper import WhisperModel

def transcribe(audio_path):
    model = WhisperModel("small", device="cpu", compute_type="int8")
    segments, _ = model.transcribe(audio_path)

    result = []
    for i, segment in enumerate(segments):
        result.append({
            "sequence_order": i + 1,
            "start_time": segment.start,
            "end_time": segment.end,
            "text": segment.text.strip(),
        })

    print(json.dumps(result))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No audio path provided"}), file=sys.stderr)
        sys.exit(1)

    transcribe(sys.argv[1])

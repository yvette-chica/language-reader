#!/usr/bin/env python3
"""
Minimal gTTS wrapper. Writes MP3 bytes to stdout.
Usage: python tts.py <text> <lang>
  lang: ISO 639-1 code, e.g. de, fr, es, hu, en
"""
import sys
import io
from gtts import gTTS

if len(sys.argv) < 3:
    sys.stderr.write("Usage: tts.py <text> <lang>\n")
    sys.exit(1)

text = sys.argv[1]
lang = sys.argv[2]

tts = gTTS(text=text, lang=lang)
buf = io.BytesIO()
tts.write_to_fp(buf)
sys.stdout.buffer.write(buf.getvalue())

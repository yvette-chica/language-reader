# Language Reader

A Progressive Web App (PWA) for listening to and reading foreign language audio, with built-in vocabulary saving and translation. Built for use in the browser and on mobile.

Currently focused on **German** and **Hungarian**.

---

## What It Does

1. **Import audio** — paste a podcast URL, YouTube URL, or upload an audio file
2. **Transcribe** — generate a timestamped transcript using local Whisper, or paste existing text (e.g. from LibriVox / Project Gutenberg) and add timing manually
3. **Read along** — follow the transcript in sync while the audio plays
4. **Sentence mode** — play one sentence at a time; repeat as many times as needed before moving on
5. **Look up words** — tap any word to translate it and save it to your vocabulary list

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React (PWA) | Works in browser and installable on mobile |
| Backend | Node.js + Express | Local server; portable to hosting later |
| Transcription | faster-whisper (local) | Free, runs on your machine; can switch to OpenAI Whisper API later |
| Audio extraction | yt-dlp | Extracts audio from YouTube and other sites before transcription |
| Translation | DeepL API (free tier) | 500k characters/month free; excellent for German and Hungarian |
| Database | SQLite | Zero setup, single file; swap to PostgreSQL when hosting |

---

## Architecture

```
Browser / Phone (React PWA)
         |
Node.js + Express (local server)
         |               |
   Whisper (local)   DeepL API
         |
     SQLite DB
  (transcripts, saved words)
```

---

## API Accounts Needed

- **DeepL** — [Sign up for free](https://www.deepl.com/pro-api) — free tier is sufficient for personal use
- **OpenAI** — not required while running locally with Whisper

---

## Planned Features

- [ ] Import audio via URL (podcast, YouTube) or file upload
- [ ] Generate transcript with Whisper (user-triggered) or paste existing text manually
- [ ] Edit transcript segment timing
- [ ] Synchronized audio + transcript playback
- [ ] Sentence mode — play one sentence at a time for focused listening
- [ ] Tap a word to see translation
- [ ] Save unknown words to a personal vocabulary list, with language-specific metadata (e.g. grammatical gender)
- [ ] Review saved vocabulary

---

## Running Locally

> Setup instructions will go here once the project is scaffolded.

---

## Future / Hosting

The app is designed to move to hosted infrastructure when ready:
- Node.js backend can be deployed to any VPS or platform (Render, Railway, Fly.io)
- SQLite can be swapped for PostgreSQL with minimal changes
- React frontend can be served as a static site (Vercel, Netlify) or from the same server

# Language Reader

A Progressive Web App (PWA) for listening to and reading foreign language audio, with built-in vocabulary saving and translation. Built for use in the browser and on mobile.

Currently focused on **German** and **Hungarian**.

---

## What It Does

1. **Import audio** — paste a URL or upload an audio file from the internet
2. **Auto-transcribe** — generates a time-stamped transcript from the audio
3. **Read along** — follow the transcript in sync while the audio plays
4. **Look up words** — tap any word to translate it and save it to your vocabulary list

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React (PWA) | Works in browser and installable on mobile |
| Backend | Node.js + Express | Local server; portable to hosting later |
| Transcription | Whisper (local) | Free, runs on your machine; can switch to OpenAI Whisper API later |
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

- [ ] Import audio via URL or file upload
- [ ] Auto-generate transcript with word-level timestamps
- [ ] Synchronized audio + transcript playback
- [ ] Tap a word to see translation
- [ ] Save unknown words to a personal vocabulary list
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

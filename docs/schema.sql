-- Language Reader — Database Schema
-- SQLite compatible. For PostgreSQL, change INTEGER PRIMARY KEY to SERIAL PRIMARY KEY
-- and DATETIME to TIMESTAMPTZ.

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  source_language TEXT NOT NULL DEFAULT 'en',        -- native/translation language
  active_language TEXT NOT NULL DEFAULT 'de',        -- language currently being studied
  lookup_service  TEXT NOT NULL DEFAULT 'mymemory', -- mymemory, pons, deepl, none
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  language    TEXT NOT NULL, -- target language for this course
  theme       TEXT,          -- e.g. culture, news, literature, travel
  description TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lessons (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id       INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  type            TEXT NOT NULL, -- podcast, news_report, poem, novel, song, etc.
  audio_url       TEXT,          -- URL source (nullable if file uploaded)
  audio_file_path TEXT,          -- server file path (nullable if URL used)
  duration        INTEGER,       -- length in seconds
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transcripts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id  INTEGER NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transcript_segments (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  transcript_id  INTEGER NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,
  start_time     REAL,          -- seconds, e.g. 12.4 — nullable for manual transcripts
  end_time       REAL,
  text           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vocab_lists (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,    -- e.g. Week 1, Travel words, B2 prep
  language   TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS words (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id       INTEGER REFERENCES lessons(id) ON DELETE SET NULL, -- nullable
  word            TEXT NOT NULL,
  language        TEXT NOT NULL,    -- target language of the word
  translation     TEXT,
  source_language TEXT NOT NULL,    -- language the translation is in
  context         TEXT,             -- full sentence the word appeared in
  status          TEXT NOT NULL DEFAULT 'unknown', -- unknown, recognized, familiar, learned
  attributes      TEXT,                            -- JSON, language-specific metadata e.g. {"gender": "feminine"}
  saved_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS word_vocab_lists (
  word_id       INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  vocab_list_id INTEGER NOT NULL REFERENCES vocab_lists(id) ON DELETE CASCADE,
  PRIMARY KEY (word_id, vocab_list_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_courses_user_language ON courses(user_id, language);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_segments_transcript ON transcript_segments(transcript_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_words_user ON words(user_id, language);
CREATE INDEX IF NOT EXISTS idx_words_status ON words(user_id, status);

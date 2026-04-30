import { useState, useEffect, useRef } from 'react'
import { api } from '../api.js'
import { useLanguage, LANGUAGES } from '../LanguageContext.jsx'
import { TrashIcon } from '../components/Icons.jsx'

const STATUSES = ['unknown', 'recognized', 'familiar', 'learned']

// How many times each status level is shown per day
// Status 1 (unknown)=3, 2 (recognized)=2, 3 (familiar)=1, 4 (learned)=0
const DAILY_COUNTS = { unknown: 3, recognized: 2, familiar: 1, learned: 0 }

const ARTICLES = {
  de: { masculine: 'der', feminine: 'die', neuter: 'das' },
  fr: { masculine: 'le',  feminine: 'la'                 },
  es: { masculine: 'el',  feminine: 'la'                 },
}

const LANG_BCP47 = {
  en: 'en-US', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', hu: 'hu-HU',
}

function getArticle(language, gender) {
  return ARTICLES[language]?.[gender] ?? null
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Daily review tracking (localStorage) ─────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'
const STORAGE_KEY = `fcr-${TODAY}`

function loadReviews() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  catch { return {} }
}

function saveReview(wordId) {
  const r = loadReviews()
  r[String(wordId)] = (r[String(wordId)] ?? 0) + 1
  localStorage.setItem(STORAGE_KEY, JSON.stringify(r))
}

function getRemainingForWord(word, reviews) {
  const max  = DAILY_COUNTS[word.status ?? 'unknown'] ?? 0
  const done = reviews[String(word.id)] ?? 0
  return Math.max(0, max - done)
}

// Build a shuffled deck of word ids, one id per due review slot
function buildDeck(words) {
  const reviews = loadReviews()
  const pool = []
  for (const w of words) {
    const n = getRemainingForWord(w, reviews)
    for (let i = 0; i < n; i++) pool.push(w.id)
  }
  return shuffle(pool)
}

// Remove stale review entries (>7 days old) to avoid localStorage bloat
function cleanupOldReviews() {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  Object.keys(localStorage)
    .filter(k => k.startsWith('fcr-') && k.slice(4) < cutoffStr)
    .forEach(k => localStorage.removeItem(k))
}

// ── TTS ───────────────────────────────────────────────────────────────────────

function speakWord(text, langCode) {
  const url = `/api/tts?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(langCode)}`
  const audio = new Audio(url)
  audio.play().catch(() => {})
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FlashcardsPage() {
  const { activeLanguage } = useLanguage()
  const langName = LANGUAGES.find(l => l.code === activeLanguage)?.name ?? activeLanguage

  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)
  const [cardId, setCardId] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [done, setDone] = useState(false)

  const wordsMap  = useRef(new Map())
  const deck      = useRef([])
  const deckIndex = useRef(0)

  useEffect(() => {
    cleanupOldReviews()
    setLoading(true)
    setDone(false)
    api.get('/words')
      .then(ws => {
        const filtered = ws.filter(w => w.language === activeLanguage)
        wordsMap.current = new Map(filtered.map(w => [w.id, w]))
        setWords(filtered)
        const d = buildDeck(filtered)
        deck.current = d
        deckIndex.current = 0
        if (d.length === 0) {
          setDone(true)
          setCardId(null)
        } else {
          setCardId(d[0])
        }
        setRevealed(false)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeLanguage])

  // Walk forward from fromIndex, skipping cards that are no longer due
  function findNext(fromIndex) {
    const reviews = loadReviews()
    for (let i = fromIndex; i < deck.current.length; i++) {
      const id   = deck.current[i]
      const word = wordsMap.current.get(id)
      if (word && getRemainingForWord(word, reviews) > 0) return { id, index: i }
    }
    return null
  }

  // Count a review for the current card, then advance
  function advanceCard() {
    if (cardId != null) saveReview(cardId)
    const next = findNext(deckIndex.current + 1)
    if (!next) {
      setDone(true)
      setCardId(null)
    } else {
      deckIndex.current = next.index
      setCardId(next.id)
      setRevealed(false)
      setConfirmDelete(false)
    }
  }

  async function handleStatus(newStatus) {
    if (!cardId || saving) return
    setSaving(true)
    try {
      await api.patch(`/words/${cardId}`, { status: newStatus })
      const updated = { ...wordsMap.current.get(cardId), status: newStatus }
      wordsMap.current.set(cardId, updated)
      setWords(prev => prev.map(w => w.id === cardId ? updated : w))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!cardId || deleting) return
    setDeleting(true)
    try {
      await api.delete(`/words/${cardId}`)
      wordsMap.current.delete(cardId)
      setWords(prev => prev.filter(w => w.id !== cardId))
      // Advance without counting a review for the deleted card
      const next = findNext(deckIndex.current + 1)
      if (!next) {
        setDone(true)
        setCardId(null)
      } else {
        deckIndex.current = next.index
        setCardId(next.id)
        setRevealed(false)
        setConfirmDelete(false)
      }
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading…</p>
    </div>
  )

  if (words.length === 0) return (
    <div className="h-full flex flex-col items-center justify-center gap-2">
      <p className="text-gray-500 font-medium">No {langName} words saved yet.</p>
      <p className="text-gray-400 text-sm">Save words from a lesson to start reviewing.</p>
    </div>
  )

  if (done) return (
    <div className="h-full flex flex-col items-center justify-center gap-2">
      <p className="text-3xl text-green-400">✓</p>
      <p className="text-gray-700 font-medium">All done for today!</p>
      <p className="text-gray-400 text-sm">Come back tomorrow for your next review.</p>
    </div>
  )

  const card = wordsMap.current.get(cardId)
  if (!card) return null

  const gender   = card.attributes?.gender ?? null
  const article  = getArticle(activeLanguage, gender)
  const phrase   = article ? `${article} ${card.word}` : card.word
  const langCode = LANG_BCP47[activeLanguage] ?? activeLanguage

  return (
    <div className="h-full flex flex-col items-center justify-center px-4">

      <p className="text-xs text-gray-300 mb-8 uppercase tracking-widest">
        {langName} · {words.length} {words.length === 1 ? 'word' : 'words'}
      </p>

      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8 flex flex-col gap-6">

        {/* Word + article + speak */}
        <div className="flex items-center justify-center gap-3">
          <p className="text-3xl font-semibold text-gray-800 tracking-tight">
            {article && <span className="text-gray-400 font-normal mr-1.5">{article}</span>}
            {card.word}
          </p>
          <button
            onClick={() => speakWord(phrase, langCode)}
            className="shrink-0 w-9 h-9 rounded-full bg-gray-100 hover:bg-indigo-100 text-gray-500 hover:text-indigo-600 flex items-center justify-center transition-colors cursor-pointer text-base"
            title={`Pronounce "${phrase}"`}
          >
            🔊
          </button>
        </div>

        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full py-3 rounded-xl border border-dashed border-gray-300 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 text-sm transition-colors cursor-pointer"
          >
            Tap to reveal
          </button>
        ) : (
          <>
            {/* Translation */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-gray-700 text-xl text-center leading-snug">
                {card.translation || (
                  <span className="text-gray-300 italic text-base">no translation saved</span>
                )}
              </p>
            </div>

            {/* Context */}
            {card.context && (
              <p className="text-sm text-gray-400 italic text-center leading-relaxed">
                "{card.context}"
              </p>
            )}

            {/* Delete + status row */}
            <div className="flex gap-2 items-center">
              {confirmDelete ? (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-2.5 py-2 rounded-xl text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-2.5 py-2 rounded-xl text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {deleting ? '…' : 'Delete'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  title="Delete"
                  className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <TrashIcon />
                </button>
              )}

              {STATUSES.map((s, i) => (
                <button
                  key={s}
                  onClick={() => handleStatus(s)}
                  disabled={saving}
                  title={s}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                    (card.status ?? 'unknown') === s
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={advanceCard}
              className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              Next →
            </button>
          </>
        )}
      </div>

    </div>
  )
}

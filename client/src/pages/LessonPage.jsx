import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'

function isYouTubeUrl(url) {
  return url.includes('youtube.com') || url.includes('youtu.be')
}

function getYouTubeVideoId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
  return match ? match[1] : null
}

function cleanWord(token) {
  return token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
}

const STATUSES = ['unknown', 'recognized', 'familiar', 'learned']

const GENDERS = [
  { value: 'masculine', label: 'M', active: 'bg-blue-500 border-blue-500 text-white',   inactive: 'border-blue-200 text-blue-600 hover:bg-blue-50' },
  { value: 'feminine',  label: 'F', active: 'bg-red-500 border-red-500 text-white',     inactive: 'border-red-200 text-red-600 hover:bg-red-50' },
  { value: 'neuter',    label: 'N', active: 'bg-green-500 border-green-500 text-white', inactive: 'border-green-200 text-green-600 hover:bg-green-50' },
]

// All class combinations written out explicitly so Tailwind includes them in the build
const WORD_HIGHLIGHT = {
  default: {
    unknown:    'bg-purple-200 text-purple-900 rounded px-0.5',
    recognized: 'bg-purple-200/60 text-purple-900 rounded px-0.5',
    familiar:   'bg-purple-200/30 text-purple-900 rounded px-0.5',
    learned:    'underline decoration-purple-400 underline-offset-2',
  },
  masculine: {
    unknown:    'bg-blue-200 text-blue-900 rounded px-0.5',
    recognized: 'bg-blue-200/60 text-blue-900 rounded px-0.5',
    familiar:   'bg-blue-200/30 text-blue-900 rounded px-0.5',
    learned:    'underline decoration-blue-400 underline-offset-2',
  },
  feminine: {
    unknown:    'bg-red-200 text-red-900 rounded px-0.5',
    recognized: 'bg-red-200/60 text-red-900 rounded px-0.5',
    familiar:   'bg-red-200/30 text-red-900 rounded px-0.5',
    learned:    'underline decoration-red-400 underline-offset-2',
  },
  neuter: {
    unknown:    'bg-green-200 text-green-900 rounded px-0.5',
    recognized: 'bg-green-200/60 text-green-900 rounded px-0.5',
    familiar:   'bg-green-200/30 text-green-900 rounded px-0.5',
    learned:    'underline decoration-green-400 underline-offset-2',
  },
}

function savedWordClass(wordData) {
  const gender = wordData.attributes?.gender
  const status = wordData.status ?? 'unknown'
  const group = WORD_HIGHLIGHT[gender] ?? WORD_HIGHLIGHT.default
  return group[status] ?? WORD_HIGHLIGHT.default.unknown
}

function Segment({ text, onWordClick, isActive, savedWords, selectedWord }) {
  const tokens = text.split(/(\s+)/)
  return (
    <p className={`leading-relaxed mb-3 last:mb-0 transition-colors ${isActive ? 'text-indigo-700 underline underline-offset-4 decoration-indigo-300' : 'text-gray-800'}`}>
      {tokens.map((token, i) => {
        if (/^\s+$/.test(token)) return <span key={i}>{token}</span>
        const word = cleanWord(token)
        if (!word) return <span key={i}>{token}</span>
        const savedWord = savedWords.get(word.toLowerCase())
        const isSelected = selectedWord && word.toLowerCase() === selectedWord.toLowerCase()
        return (
          <span
            key={i}
            onClick={() => onWordClick(word, text)}
            className={`cursor-pointer transition-colors ${
              isSelected
                ? 'bg-indigo-300 text-indigo-900 rounded px-0.5'
                : savedWord
                  ? savedWordClass(savedWord)
                  : 'hover:bg-indigo-100 hover:text-indigo-700 rounded px-0.5'
            }`}
          >
            {token}
          </span>
        )
      })}
    </p>
  )
}

function LessonPage() {
  const { courseId, lessonId } = useParams()
  const navigate = useNavigate()

  const [lesson, setLesson] = useState(null)
  const [course, setCourse] = useState(null)
  const [transcript, setTranscript] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [editingLesson, setEditingLesson] = useState(false)
  const [editLessonTitle, setEditLessonTitle] = useState('')
  const [savingLesson, setSavingLesson] = useState(false)
  const [confirmDeleteLesson, setConfirmDeleteLesson] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualText, setManualText] = useState('')
  const [submittingManual, setSubmittingManual] = useState(false)

  const [settings, setSettings] = useState(null)
  const [savedWords, setSavedWords] = useState(new Map())

  const [selected, setSelected] = useState(null)
  const [translation, setTranslation] = useState('')
  const [pendingGender, setPendingGender] = useState(null)
  const [showGenderPicker, setShowGenderPicker] = useState(false)
  const [wordStatus, setWordStatus] = useState('unknown')
  const [lookingUp, setLookingUp] = useState(null)
  const [lookupResult, setLookupResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState(null)

  const audioRef = useRef(null)
  const ytWrapperRef = useRef(null)
  const ytPlayerRef = useRef(null)
  const ytIntervalRef = useRef(null)
  const transcriptRef = useRef(null)
  const [activeSegmentId, setActiveSegmentId] = useState(null)

  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)

  // Split layout drag
  const containerRef = useRef(null)
  const isDragging = useRef(false)
  const [leftWidth, setLeftWidth] = useState(() => {
    const stored = localStorage.getItem('lesson_split_width')
    return stored ? parseFloat(stored) : 50
  })

  useEffect(() => { transcriptRef.current = transcript }, [transcript])

  function updateActiveSegment(t) {
    const segs = transcriptRef.current?.segments
    if (!segs) return
    const active = segs.find(seg => seg.start_time != null && t >= seg.start_time && t < seg.end_time)
    setActiveSegmentId(prev => { const id = active?.id ?? null; return prev === id ? prev : id })
  }

  function handleTimeUpdate() {
    const t = audioRef.current?.currentTime
    if (t != null) updateActiveSegment(t)
  }

  useLayoutEffect(() => {
    const wrapper = ytWrapperRef.current
    if (!wrapper || !lesson?.audio_url || !isYouTubeUrl(lesson.audio_url)) return
    const videoId = getYouTubeVideoId(lesson.audio_url)
    if (!videoId) return

    // Create the inner container imperatively — NOT in React's tree — so YouTube
    // can replace it with an iframe without desynchronising React's virtual DOM.
    const container = document.createElement('div')
    container.className = 'absolute inset-0 w-full h-full'
    wrapper.appendChild(container)

    function createPlayer() {
      if (!container.isConnected) return
      ytPlayerRef.current = new window.YT.Player(container, {
        videoId,
        playerVars: { rel: 0 },
        events: {
          onStateChange(event) {
            if (event.data === window.YT.PlayerState.PLAYING) {
              ytIntervalRef.current = setInterval(() => {
                const t = ytPlayerRef.current?.getCurrentTime?.()
                if (t != null) updateActiveSegment(t)
              }, 250)
            } else {
              clearInterval(ytIntervalRef.current)
            }
          },
        },
      })
    }

    if (window.YT?.Player) {
      createPlayer()
    } else {
      if (!document.getElementById('yt-iframe-api')) {
        const tag = document.createElement('script')
        tag.id = 'yt-iframe-api'
        tag.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(tag)
      }
      window.onYouTubeIframeAPIReady = createPlayer
    }

    return () => {
      clearInterval(ytIntervalRef.current)
      ytPlayerRef.current?.destroy?.()
      ytPlayerRef.current = null
      wrapper.innerHTML = ''
    }
  }, [lesson?.audio_url, settings?.lesson_layout])

  useEffect(() => {
    Promise.all([
      api.get('/courses'),
      api.get(`/courses/${courseId}/lessons/${lessonId}`),
      api.get(`/courses/${courseId}/lessons/${lessonId}/transcript`).catch(() => null),
      api.get('/settings'),
      api.get('/words'),
    ])
      .then(([courses, lessonData, transcriptData, settingsData, wordsData]) => {
        const found = courses.find(c => c.id === parseInt(courseId))
        if (!found) throw new Error('Course not found')
        setCourse(found)
        setLesson(lessonData)
        api.post(`/courses/${courseId}/lessons/${lessonId}/visit`).catch(() => {})
        setTranscript(transcriptData)
        setSettings(settingsData)

        const wordMap = new Map()
        wordsData.forEach(w => {
          if (!wordMap.has(w.word.toLowerCase())) wordMap.set(w.word.toLowerCase(), w)
        })
        setSavedWords(wordMap)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [courseId, lessonId])

  // Sync settings when changed via the modal
  useEffect(() => {
    function onSettingsUpdated(e) {
      destroyYTPlayer()
      setSettings(e.detail)
    }
    window.addEventListener('settings-updated', onSettingsUpdated)
    return () => window.removeEventListener('settings-updated', onSettingsUpdated)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const LAYOUTS = ['stack', 'split', 'focus', 'sentence']

    function onKeyDown(e) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return

      const currentLayout = settings?.lesson_layout ?? 'stack'

      if (e.key === 'j') {
        updateLayout(LAYOUTS[(LAYOUTS.indexOf(currentLayout) + 1) % LAYOUTS.length])
        return
      }
      if (e.key === 'k') {
        updateLayout(LAYOUTS[(LAYOUTS.indexOf(currentLayout) - 1 + LAYOUTS.length) % LAYOUTS.length])
        return
      }

      if (currentLayout !== 'sentence') return
      const segs = transcript?.segments
      if (!segs?.length) return

      if (e.key === 'ArrowLeft' || e.key === 'h') {
        e.preventDefault()
        setCurrentSegmentIndex(i => Math.max(0, i - 1))
      } else if (e.key === 'ArrowRight' || e.key === 'l') {
        e.preventDefault()
        setCurrentSegmentIndex(i => Math.min(segs.length - 1, i + 1))
      } else if (e.key === 'p') {
        const seg = segs[currentSegmentIndex]
        if (seg?.start_time != null) playSegment(seg.start_time)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [settings?.lesson_layout, transcript, currentSegmentIndex])

  // Drag-to-resize effect for split layout
  useEffect(() => {
    function onMouseMove(e) {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      const clamped = Math.min(Math.max(pct, 20), 80)
      setLeftWidth(clamped)
      localStorage.setItem('lesson_split_width', String(clamped))
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'
    }
    function onMouseUp() {
      if (isDragging.current) {
        isDragging.current = false
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
      }
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  function destroyYTPlayer() {
    clearInterval(ytIntervalRef.current)
    try { ytPlayerRef.current?.destroy() } catch {}
    ytPlayerRef.current = null
    if (ytWrapperRef.current) ytWrapperRef.current.innerHTML = ''
  }

  function updateLayout(next) {
    destroyYTPlayer()
    setSettings(prev => ({ ...prev, lesson_layout: next }))
    api.patch('/settings', { lesson_layout: next }).catch(() => {})
  }

  function playSegment(startTime) {
    if (lesson?.audio_url && isYouTubeUrl(lesson.audio_url)) {
      ytPlayerRef.current?.seekTo(startTime, true)
      ytPlayerRef.current?.playVideo()
    } else if (audioRef.current) {
      audioRef.current.currentTime = startTime
      audioRef.current.play()
    }
  }

  async function handleSaveLesson(e) {
    e.preventDefault()
    setSavingLesson(true)
    try {
      const updated = await api.patch(`/courses/${courseId}/lessons/${lessonId}`, { title: editLessonTitle })
      setLesson(updated)
      setEditingLesson(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingLesson(false)
    }
  }

  async function handleDeleteLesson() {
    try {
      await api.delete(`/courses/${courseId}/lessons/${lessonId}`)
      navigate(`/courses/${courseId}`)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleGenerateWhisper() {
    setGenerating(true)
    try {
      const result = await api.post(`/courses/${courseId}/lessons/${lessonId}/transcript/whisper`)
      setTranscript(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault()
    setSubmittingManual(true)
    try {
      const result = await api.post(`/courses/${courseId}/lessons/${lessonId}/transcript/manual`, { text: manualText })
      setTranscript(result)
      setShowManualForm(false)
      setManualText('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmittingManual(false)
    }
  }

  function handleWordClick(word, context) {
    const existing = savedWords.get(word.toLowerCase())
    setSelected({ word, context })
    setTranslation(existing?.translation ?? '')
    setWordStatus(existing?.status ?? 'unknown')
    setPendingGender(existing?.attributes?.gender ?? null)
    setShowGenderPicker(false)
    setLookupResult(null)
    setLookingUp(null)
    setSavedId(null)
  }

  function handleLookup(service) {
    setLookingUp(service)
    setLookupResult(null)
    api.get(`/lookup?word=${encodeURIComponent(selected.word)}&language=${encodeURIComponent(course.language)}&service=${service}`)
      .then(result => setLookupResult(result))
      .catch(err => setLookupResult({ error: err.message }))
      .finally(() => setLookingUp(null))
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    try {
      const saved = await api.post('/words', {
        word: selected.word,
        language: course.language,
        source_language: settings?.source_language ?? 'en',
        translation: translation || null,
        context: selected.context,
        lesson_id: parseInt(lessonId),
        attributes: pendingGender ? { gender: pendingGender } : null,
      })
      setSavedWords(prev => new Map(prev).set(saved.word.toLowerCase(), saved))
      setSavedId(saved.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    const existing = savedWords.get(selected?.word.toLowerCase())
    if (!existing) return
    setSaving(true)
    try {
      const updated = await api.patch(`/words/${existing.id}`, {
        translation: translation || null,
        status: wordStatus,
        attributes: pendingGender ? { gender: pendingGender } : null,
      })
      setSavedWords(prev => new Map(prev).set(updated.word.toLowerCase(), updated))
      setSavedId(updated.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-full bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  )
  if (error) return (
    <div className="min-h-full bg-gray-50 flex items-center justify-center">
      <p className="text-red-500 text-sm">{error}</p>
    </div>
  )

  const layout = settings?.lesson_layout ?? 'stack'
  const existingWord = selected ? savedWords.get(selected.word.toLowerCase()) : null

  // ── Shared JSX pieces ────────────────────────────────────────────────────────

  const headerJSX = (
    <div className="flex items-center gap-3 mb-8">
      <button
        onClick={() => navigate(`/courses/${courseId}`)}
        className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"
      >
        ← {course.title}
      </button>
      <span className="text-gray-300">/</span>

      {editingLesson ? (
        <form onSubmit={handleSaveLesson} className="flex items-center gap-2 flex-1">
          <input
            autoFocus
            value={editLessonTitle}
            onChange={e => setEditLessonTitle(e.target.value)}
            required
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="submit"
            disabled={savingLesson}
            className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 cursor-pointer"
          >
            {savingLesson ? '...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => setEditingLesson(false)}
            className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            Cancel
          </button>
        </form>
      ) : confirmDeleteLesson ? (
        <div className="flex items-center gap-3 flex-1">
          <h1 className="text-2xl font-semibold text-gray-800">{lesson.title}</h1>
          <span className="text-sm text-gray-500">Delete?</span>
          <button
            onClick={handleDeleteLesson}
            className="text-sm text-red-500 hover:text-red-700 font-medium cursor-pointer"
          >
            Yes
          </button>
          <button
            onClick={() => setConfirmDeleteLesson(false)}
            className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            No
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-1">
          <h1 className="text-2xl font-semibold text-gray-800">{lesson.title}</h1>
          <button
            onClick={() => { setEditingLesson(true); setEditLessonTitle(lesson.title) }}
            className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            Edit
          </button>
          <button
            onClick={() => setConfirmDeleteLesson(true)}
            className="text-sm text-gray-400 hover:text-red-500 cursor-pointer"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )

  const playerJSX = lesson.audio_url ? (
    isYouTubeUrl(lesson.audio_url) ? (
      <div ref={ytWrapperRef} className="relative w-full rounded-xl overflow-hidden" style={{ paddingBottom: '56.25%' }} />
    ) : (
      <audio ref={audioRef} controls src={lesson.audio_url} onTimeUpdate={handleTimeUpdate} className="w-full" />
    )
  ) : null

  const transcriptJSX = !transcript ? (
    <div className="bg-white border border-gray-200 rounded-xl p-8 flex flex-col items-center gap-4 text-center">
      <p className="text-gray-500 font-medium">No transcript yet</p>

      {generating ? (
        <p className="text-sm text-indigo-500">Generating transcript, this may take a minute…</p>
      ) : showManualForm ? (
        <form onSubmit={handleManualSubmit} className="w-full flex flex-col gap-3 text-left">
          <textarea
            autoFocus
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            required
            rows={8}
            placeholder="Paste the text here. It will be split into sentences automatically."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submittingManual}
              className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 cursor-pointer"
            >
              {submittingManual ? '...' : 'Save transcript'}
            </button>
            <button
              type="button"
              onClick={() => { setShowManualForm(false); setManualText('') }}
              className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex gap-3">
          {lesson.audio_url && (
            <button
              onClick={handleGenerateWhisper}
              className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium cursor-pointer"
            >
              Generate with Whisper
            </button>
          )}
          <button
            onClick={() => setShowManualForm(true)}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium cursor-pointer"
          >
            Add manually
          </button>
        </div>
      )}
    </div>
  ) : transcript.segments.length === 0 ? (
    <p className="text-sm text-gray-400">Transcript is empty.</p>
  ) : (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      {transcript.segments.map(seg => (
        <Segment
          key={seg.id}
          text={seg.text}
          onWordClick={handleWordClick}
          isActive={seg.id === activeSegmentId}
          savedWords={savedWords}
          selectedWord={selected?.word}
        />
      ))}
    </div>
  )

  const lookupJSX = selected && (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">{selected.word}</h2>
        <button
          onClick={() => setSelected(null)}
          className="text-gray-400 hover:text-gray-600 cursor-pointer text-xl leading-none"
        >
          ×
        </button>
      </div>

      <textarea
        value={translation}
        onChange={e => { setTranslation(e.target.value); setSavedId(null) }}
        placeholder="Your translation..."
        rows={3}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none shrink-0"
      />

      {(pendingGender || showGenderPicker) ? (
        <div className="flex items-center gap-1.5">
          {GENDERS.map(g => (
            <button
              key={g.value}
              title={g.value}
              onClick={() => {
                setPendingGender(pendingGender === g.value ? null : g.value)
                setSavedId(null)
              }}
              className={`text-xs w-8 h-8 rounded-lg border font-medium cursor-pointer transition-colors ${
                pendingGender === g.value ? g.active : g.inactive
              }`}
            >
              {g.label}
            </button>
          ))}
          {!pendingGender && (
            <button
              onClick={() => setShowGenderPicker(false)}
              className="text-gray-300 hover:text-gray-500 cursor-pointer text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowGenderPicker(true)}
          className="self-start text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          add gender?
        </button>
      )}

      {settings?.available_services?.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Dictionaries</p>
          <div className="flex flex-wrap gap-2">
            {settings.available_services.map(service => (
              <button
                key={service}
                onClick={() => handleLookup(service)}
                disabled={!!lookingUp}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 cursor-pointer transition-colors"
              >
                {lookingUp === service ? '...' : service}
              </button>
            ))}
          </div>

          {lookupResult && (
            <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-2">
              {lookupResult.error ? (
                <p className="text-xs text-red-400">{lookupResult.error}</p>
              ) : lookupResult.translation ? (
                <>
                  <p className="text-sm font-medium text-gray-800">{lookupResult.translation}</p>
                  {lookupResult.wordclass && (
                    <p className="text-xs text-gray-400">{lookupResult.wordclass}</p>
                  )}
                  {lookupResult.examples?.length > 0 && (
                    <ul className="flex flex-col gap-1.5">
                      {lookupResult.examples.slice(0, 2).map((ex, i) => (
                        <li key={i} className="text-xs text-gray-500">
                          <span className="italic">{ex.source}</span>
                          <span className="text-gray-300 mx-1">→</span>
                          <span>{ex.target}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => {
                      setTranslation(lookupResult.translation)
                      setPendingGender(lookupResult.gender ?? null)
                      setSavedId(null)
                    }}
                    className="self-start text-xs text-indigo-500 hover:text-indigo-700 cursor-pointer"
                  >
                    Use this
                  </button>
                </>
              ) : (
                <p className="text-xs text-gray-400">No result found.</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 leading-relaxed italic">
        "{selected.context}"
      </div>

      {existingWord && (
        <div className="flex items-center gap-1">
          {STATUSES.map((s, i) => (
            <button
              key={s}
              title={s}
              onClick={() => { setWordStatus(s); setSavedId(null) }}
              className={`w-8 h-8 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                wordStatus === s
                  ? 'bg-indigo-500 border-indigo-500 text-white'
                  : 'border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {savedId ? (
        <p className="text-sm text-green-600 font-medium">Saved!</p>
      ) : (
        <button
          onClick={existingWord ? handleUpdate : handleSave}
          disabled={saving}
          className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 cursor-pointer"
        >
          {saving ? '...' : existingWord ? 'Update' : 'Save word'}
        </button>
      )}
    </>
  )

  // ── Stack layout (default) ───────────────────────────────────────────────────
  if (layout === 'stack') {
    return (
      <div key="stack" className="h-full bg-gray-50 flex overflow-hidden">
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-8">
            {headerJSX}
            {playerJSX && <div className="mb-8">{playerJSX}</div>}
            {transcriptJSX}
          </div>
        </div>

        <div className={`
          shrink-0 border-l border-gray-200 bg-white flex flex-col gap-4
          transition-all duration-200
          ${selected ? 'w-72 p-6 overflow-y-auto' : 'w-0 p-0 overflow-hidden'}
        `}>
          {lookupJSX}
        </div>
      </div>
    )
  }

  // ── Split layout ─────────────────────────────────────────────────────────────
  if (layout === 'split') {
    return (
      <div key="split" className="h-full flex overflow-hidden bg-gray-50" ref={containerRef}>

        {/* Left pane: video + lookup */}
        <div style={{ width: `${leftWidth}%` }} className="flex flex-col overflow-hidden bg-white border-r border-gray-100 flex-shrink-0">
          {playerJSX && (
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
              {playerJSX}
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            {selected
              ? lookupJSX
              : <p className="text-sm text-gray-400 text-center mt-8">Click a word to look it up</p>
            }
          </div>
        </div>

        {/* Drag divider */}
        <div
          onMouseDown={() => { isDragging.current = true }}
          className="w-1.5 bg-gray-200 hover:bg-indigo-400 cursor-col-resize flex-shrink-0 transition-colors"
        />

        {/* Right pane: transcript */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-8">
            {headerJSX}
            {transcriptJSX}
          </div>
        </div>

      </div>
    )
  }

  // ── Sentence layout ──────────────────────────────────────────────────────────
  if (layout === 'sentence') {
    const segments = transcript?.segments ?? []
    const seg = segments[currentSegmentIndex]
    const hasPrev = currentSegmentIndex > 0
    const hasNext = currentSegmentIndex < segments.length - 1

    return (
      <div key="sentence" className="h-full bg-gray-50 flex overflow-hidden">

        {/* Main area */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="px-6 pt-6 shrink-0">
            {headerJSX}
          </div>

          {/* Video */}
          {playerJSX && (
            <div className="px-6 pb-4 shrink-0">
              {playerJSX}
            </div>
          )}

          {/* Segment display */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8">
            {seg ? (
              <div className="max-w-2xl w-full bg-white border border-gray-200 rounded-xl p-8 text-lg leading-relaxed">
                <Segment
                  text={seg.text}
                  onWordClick={handleWordClick}
                  isActive={false}
                  savedWords={savedWords}
                  selectedWord={selected?.word}
                />
              </div>
            ) : (
              <div className="max-w-2xl w-full">
                {transcriptJSX}
              </div>
            )}

            {segments.length > 0 && (
              <div className="flex items-center gap-6 mt-6">
                <button
                  onClick={() => setCurrentSegmentIndex(i => Math.max(0, i - 1))}
                  disabled={!hasPrev}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer disabled:cursor-default text-xl transition-colors"
                  title="Previous (h / ←)"
                >
                  ←
                </button>
                <span className="text-sm text-gray-400 tabular-nums">
                  {currentSegmentIndex + 1} / {segments.length}
                </span>
                <button
                  onClick={() => setCurrentSegmentIndex(i => Math.min(segments.length - 1, i + 1))}
                  disabled={!hasNext}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer disabled:cursor-default text-xl transition-colors"
                  title="Next (l / →)"
                >
                  →
                </button>
              </div>
            )}

            <p className="mt-4 text-xs text-gray-300">
              h/l or ←/→ to navigate · p to play · j/k to switch layout
            </p>
          </div>

        </div>

        {/* Lookup sidebar */}
        <div className={`
          shrink-0 border-l border-gray-200 bg-white flex flex-col gap-4
          transition-all duration-200
          ${selected ? 'w-72 p-6 overflow-y-auto' : 'w-0 p-0 overflow-hidden'}
        `}>
          {lookupJSX}
        </div>

      </div>
    )
  }

  // ── Focus layout (no video) ──────────────────────────────────────────────────
  return (
    <div key="focus" className="h-full bg-gray-50 flex overflow-hidden">
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {headerJSX}
          {transcriptJSX}
        </div>
      </div>

      <div className={`
        shrink-0 border-l border-gray-200 bg-white flex flex-col gap-4
        transition-all duration-200
        ${selected ? 'w-72 p-6 overflow-y-auto' : 'w-0 p-0 overflow-hidden'}
      `}>
        {lookupJSX}
      </div>
    </div>
  )
}

export default LessonPage

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'

function cleanWord(token) {
  return token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
}

function Segment({ text, onWordClick, isActive }) {
  const tokens = text.split(/(\s+)/)
  return (
    <p className={`leading-relaxed mb-3 last:mb-0 transition-colors ${isActive ? 'text-indigo-700 underline underline-offset-4 decoration-indigo-300' : 'text-gray-800'}`}>
      {tokens.map((token, i) => {
        if (/^\s+$/.test(token)) return <span key={i}>{token}</span>
        const word = cleanWord(token)
        if (!word) return <span key={i}>{token}</span>
        return (
          <span
            key={i}
            onClick={() => onWordClick(word, text)}
            className="cursor-pointer hover:bg-indigo-100 hover:text-indigo-700 rounded px-0.5 transition-colors"
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

  const [selected, setSelected] = useState(null)    // { word, context }
  const [translation, setTranslation] = useState('') // user's text field
  const [lookingUp, setLookingUp] = useState(null)   // service name currently fetching, or null
  const [lookupResult, setLookupResult] = useState(null) // { translation, definition, examples } | { error }
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState(null)

  const audioRef = useRef(null)
  const [activeSegmentId, setActiveSegmentId] = useState(null)

  function handleTimeUpdate() {
    const t = audioRef.current?.currentTime
    if (t == null || !transcript?.segments) return
    const active = transcript.segments.find(
      seg => seg.start_time != null && t >= seg.start_time && t < seg.end_time
    )
    const id = active?.id ?? null
    setActiveSegmentId(prev => prev === id ? prev : id)
  }

  useEffect(() => {
    Promise.all([
      api.get('/courses'),
      api.get(`/courses/${courseId}/lessons/${lessonId}`),
      api.get(`/courses/${courseId}/lessons/${lessonId}/transcript`).catch(() => null),
      api.get('/settings'),
    ])
      .then(([courses, lessonData, transcriptData, settingsData]) => {
        const found = courses.find(c => c.id === parseInt(courseId))
        if (!found) throw new Error('Course not found')
        setCourse(found)
        setLesson(lessonData)
        setTranscript(transcriptData)
        setSettings(settingsData)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [courseId, lessonId])

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
    setSelected({ word, context })
    setTranslation('')
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
      })
      setSavedId(saved.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  )
  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-500 text-sm">{error}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="max-w-2xl mx-auto px-4 py-8">

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

          {lesson.audio_url && (
            <div className="mb-8">
              <audio ref={audioRef} controls src={lesson.audio_url} onTimeUpdate={handleTimeUpdate} className="w-full" />
            </div>
          )}

          {!transcript ? (
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
                <Segment key={seg.id} text={seg.text} onWordClick={handleWordClick} isActive={seg.id === activeSegmentId} />
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Sidebar */}
      <div className={`
        shrink-0 border-l border-gray-200 bg-white flex flex-col gap-4
        transition-all duration-200 overflow-hidden
        ${selected ? 'w-72 p-6' : 'w-0 p-0'}
      `}>
        {selected && (
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
              onChange={e => setTranslation(e.target.value)}
              placeholder="Your translation..."
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />

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
                        {lookupResult.definition && (
                          <p className="text-xs text-gray-400">{lookupResult.definition}</p>
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
                          onClick={() => setTranslation(lookupResult.translation)}
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

            {savedId ? (
              <p className="text-sm text-green-600 font-medium">Saved!</p>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 cursor-pointer"
              >
                {saving ? '...' : 'Save word'}
              </button>
            )}
          </>
        )}
      </div>

    </div>
  )
}

export default LessonPage

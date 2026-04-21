import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'

function cleanWord(token) {
  return token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
}

function Segment({ text, onWordClick }) {
  const tokens = text.split(/(\s+)/)
  return (
    <p className="text-gray-800 leading-relaxed mb-3 last:mb-0">
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

  const [selected, setSelected] = useState(null) // { word, context }
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/courses'),
      api.get(`/courses/${courseId}/lessons/${lessonId}`),
      api.get(`/courses/${courseId}/lessons/${lessonId}/transcript`).catch(() => null),
    ])
      .then(([courses, lessonData, transcriptData]) => {
        const found = courses.find(c => c.id === parseInt(courseId))
        if (!found) throw new Error('Course not found')
        setCourse(found)
        setLesson(lessonData)
        setTranscript(transcriptData)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [courseId, lessonId])

  function handleWordClick(word, context) {
    setSelected({ word, context })
    setSavedId(null)
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    try {
      const saved = await api.post('/words', {
        word: selected.word,
        language: course.language,
        source_language: 'en',
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
              className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              ← {course.title}
            </button>
            <span className="text-gray-300">/</span>
            <h1 className="text-2xl font-semibold text-gray-800">{lesson.title}</h1>
          </div>

          {lesson.audio_url && (
            <div className="mb-8">
              <audio controls src={lesson.audio_url} className="w-full" />
            </div>
          )}

          {!transcript ? (
            <p className="text-sm text-gray-400">No transcript yet for this lesson.</p>
          ) : transcript.segments.length === 0 ? (
            <p className="text-sm text-gray-400">Transcript is empty.</p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              {transcript.segments.map(seg => (
                <Segment key={seg.id} text={seg.text} onWordClick={handleWordClick} />
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

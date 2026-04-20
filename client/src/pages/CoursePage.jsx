import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'

function CoursePage() {
  const { courseId } = useParams()
  const navigate = useNavigate()

  const [course, setCourse] = useState(null)
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState('podcast')
  const [newAudioUrl, setNewAudioUrl] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/courses`),
      api.get(`/courses/${courseId}/lessons`),
    ])
      .then(([coursesData, lessonsData]) => {
        const found = coursesData.find(c => c.id === parseInt(courseId))
        if (!found) {
          setError('Course not found')
        } else {
          setCourse(found)
          setLessons(lessonsData)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [courseId])

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    try {
      const body = { title: newTitle, type: newType }
      if (newAudioUrl.trim()) body.audio_url = newAudioUrl.trim()
      const lesson = await api.post(`/courses/${courseId}/lessons`, body)
      setLessons(prev => [...prev, lesson])
      setNewTitle('')
      setNewType('podcast')
      setNewAudioUrl('')
      setShowForm(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400 text-sm">Loading...</p></div>
  if (error) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-red-500 text-sm">{error}</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            ← Courses
          </button>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-semibold text-gray-800">{course.title}</h1>
          <span className="text-sm text-gray-400 bg-gray-100 rounded px-2 py-0.5">{course.language}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-700">Lessons</h2>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium cursor-pointer"
          >
            New lesson
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Lesson title"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                required
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <select
                value={newType}
                onChange={e => setNewType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="podcast">Podcast</option>
                <option value="news_report">News report</option>
                <option value="song">Song</option>
                <option value="poem">Poem</option>
                <option value="novel">Novel</option>
              </select>
            </div>
            <input
              type="url"
              placeholder="Audio URL (optional)"
              value={newAudioUrl}
              onChange={e => setNewAudioUrl(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 cursor-pointer"
              >
                {creating ? '...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {!loading && lessons.length === 0 && (
          <p className="text-sm text-gray-400">No lessons yet. Create one to get started.</p>
        )}

        <div className="flex flex-col gap-3">
          {lessons.map(lesson => (
            <button
              key={lesson.id}
              onClick={() => navigate(`/courses/${courseId}/lessons/${lesson.id}`)}
              className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <p className="font-medium text-gray-800">{lesson.title}</p>
              <p className="text-sm text-gray-400 mt-1">{lesson.type}</p>
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}

export default CoursePage

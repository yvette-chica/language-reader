import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useLanguage, LANGUAGES } from '../LanguageContext.jsx'

const GRADIENTS = [
  'from-indigo-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500',
  'from-teal-400 to-cyan-500',
  'from-violet-500 to-indigo-400',
  'from-emerald-400 to-teal-500',
  'from-sky-400 to-blue-500',
]

function isYouTubeUrl(url) {
  return url && (url.includes('youtube.com') || url.includes('youtu.be'))
}

function getYouTubeThumbnail(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null
}

function RecentLessonCard({ lesson, index, onClick }) {
  const thumbnailUrl = lesson.thumbnail_url
    ?? (isYouTubeUrl(lesson.audio_url) ? getYouTubeThumbnail(lesson.audio_url) : null)
  const gradient = GRADIENTS[index % GRADIENTS.length]

  return (
    <button
      onClick={onClick}
      className="shrink-0 w-60 rounded-xl overflow-hidden border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer text-left"
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="w-full h-36 object-cover"
        />
      ) : (
        <div className={`w-full h-36 bg-gradient-to-br ${gradient}`} />
      )}
      <div className="px-3 py-2.5">
        <p className="text-sm font-medium text-gray-800 truncate leading-snug">{lesson.title}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{lesson.course_title}</p>
      </div>
    </button>
  )
}

function CoursesPage() {
  const [courses, setCourses] = useState([])
  const [recentLessons, setRecentLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)

  const navigate = useNavigate()
  const { activeLanguage } = useLanguage()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/courses'),
      api.get(`/lessons/recent?language=${activeLanguage}`),
    ])
      .then(([coursesData, recentData]) => {
        setCourses(coursesData)
        setRecentLessons(recentData)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [activeLanguage])

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    try {
      const course = await api.post('/courses', { title: newTitle, language: activeLanguage })
      setCourses(prev => [...prev, course])
      setNewTitle('')
      setShowForm(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="bg-gray-50 min-h-full">
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">
            {LANGUAGES.find(l => l.code === activeLanguage)?.name ?? activeLanguage}
          </h1>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex gap-2">
            <input
              type="text"
              placeholder="Course title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
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
          </form>
        )}

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
        {loading && <p className="text-sm text-gray-400">Loading...</p>}

        {!loading && recentLessons.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Continue studying</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {recentLessons.map((lesson, i) => (
                <RecentLessonCard
                  key={lesson.id}
                  lesson={lesson}
                  index={i}
                  onClick={() => navigate(`/courses/${lesson.course_id}/lessons/${lesson.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Courses</h2>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium cursor-pointer"
          >
            New course
          </button>
        </div>

        {!loading && courses.filter(c => c.language === activeLanguage).length === 0 && (
          <p className="text-sm text-gray-400">No courses yet for this language. Create one to get started.</p>
        )}

        <div className="flex flex-col gap-3">
          {courses.filter(c => c.language === activeLanguage).map(course => (
            <button
              key={course.id}
              onClick={() => navigate(`/courses/${course.id}`)}
              className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <p className="font-medium text-gray-800">{course.title}</p>
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}

export default CoursesPage

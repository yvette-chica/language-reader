import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useLanguage, LANGUAGES } from '../LanguageContext.jsx'

function CoursesPage() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)

  const navigate = useNavigate()
  const { activeLanguage } = useLanguage()

  useEffect(() => {
    api.get('/courses')
      .then(data => setCourses(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

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

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">
            {LANGUAGES.find(l => l.code === activeLanguage)?.name ?? activeLanguage} Courses
          </h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium cursor-pointer"
          >
            New course
          </button>
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

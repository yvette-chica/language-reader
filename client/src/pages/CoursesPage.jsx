import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, clearToken } from '../api.js'

function CoursesPage() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newLanguage, setNewLanguage] = useState('')
  const [creating, setCreating] = useState(false)

  const navigate = useNavigate()

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
      const course = await api.post('/courses', { title: newTitle, language: newLanguage })
      setCourses(prev => [...prev, course])
      setNewTitle('')
      setNewLanguage('')
      setShowForm(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">My Courses</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(true)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium cursor-pointer"
            >
              New course
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              Log out
            </button>
          </div>
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
            <input
              type="text"
              placeholder="Language (e.g. de)"
              value={newLanguage}
              onChange={e => setNewLanguage(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-indigo-400"
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

        {!loading && courses.length === 0 && (
          <p className="text-sm text-gray-400">No courses yet. Create one to get started.</p>
        )}

        <div className="flex flex-col gap-3">
          {courses.map(course => (
            <button
              key={course.id}
              onClick={() => navigate(`/courses/${course.id}`)}
              className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <p className="font-medium text-gray-800">{course.title}</p>
              <p className="text-sm text-gray-400 mt-1">{course.language}</p>
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}

export default CoursesPage

import { Routes, Route, Navigate } from 'react-router-dom'
import { isLoggedIn } from './api.js'
import LoginPage from './pages/LoginPage.jsx'
import CoursesPage from './pages/CoursesPage.jsx'
import CoursePage from './pages/CoursePage.jsx'
import LessonPage from './pages/LessonPage.jsx'

function ProtectedRoute({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><CoursesPage /></ProtectedRoute>} />
      <Route path="/courses/:courseId" element={<ProtectedRoute><CoursePage /></ProtectedRoute>} />
      <Route path="/courses/:courseId/lessons/:lessonId" element={<ProtectedRoute><LessonPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

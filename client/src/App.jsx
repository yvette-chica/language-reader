import { Routes, Route, Navigate } from 'react-router-dom'
import { isLoggedIn } from './api.js'
import Nav from './components/Nav.jsx'
import LoginPage from './pages/LoginPage.jsx'
import CoursesPage from './pages/CoursesPage.jsx'
import CoursePage from './pages/CoursePage.jsx'
import LessonPage from './pages/LessonPage.jsx'

function ProtectedLayout({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return (
    <>
      <Nav />
      {children}
    </>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedLayout><CoursesPage /></ProtectedLayout>} />
      <Route path="/courses/:courseId" element={<ProtectedLayout><CoursePage /></ProtectedLayout>} />
      <Route path="/courses/:courseId/lessons/:lessonId" element={<ProtectedLayout><LessonPage /></ProtectedLayout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

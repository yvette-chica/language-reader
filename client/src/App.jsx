import { Routes, Route, Navigate } from 'react-router-dom'
import { isLoggedIn } from './api.js'
import { LanguageProvider } from './LanguageContext.jsx'
import Nav from './components/Nav.jsx'
import Sidebar from './components/Sidebar.jsx'
import LoginPage from './pages/LoginPage.jsx'
import CoursesPage from './pages/CoursesPage.jsx'
import CoursePage from './pages/CoursePage.jsx'
import LessonPage from './pages/LessonPage.jsx'

function ProtectedLayout({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return (
    <div className="flex flex-col h-screen">
      <Nav />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <LanguageProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedLayout><CoursesPage /></ProtectedLayout>} />
        <Route path="/courses/:courseId" element={<ProtectedLayout><CoursePage /></ProtectedLayout>} />
        <Route path="/courses/:courseId/lessons/:lessonId" element={<ProtectedLayout><LessonPage /></ProtectedLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LanguageProvider>
  )
}

export default App

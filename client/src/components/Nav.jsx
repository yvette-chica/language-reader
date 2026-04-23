import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { clearToken } from '../api.js'
import { useLanguage, LANGUAGES } from '../LanguageContext.jsx'
import SettingsModal from './SettingsModal.jsx'

function LanguageDropdown() {
  const { activeLanguage, setActiveLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = LANGUAGES.find(l => l.code === activeLanguage)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
      >
        <span className="text-base leading-none">{current?.flag}</span>
        <span>{current?.name}</span>
        <span className="text-gray-400 text-[10px]">▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-36">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => {
                setActiveLanguage(lang.code)
                setOpen(false)
                if (/\/courses\/\d+/.test(location.pathname)) navigate('/')
              }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 hover:bg-gray-50 cursor-pointer transition-colors ${
                activeLanguage === lang.code ? 'text-indigo-600 font-medium' : 'text-gray-700'
              }`}
            >
              <span className="text-base leading-none">{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Nav() {
  const navigate = useNavigate()
  const [showSettings, setShowSettings] = useState(false)

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  return (
    <>
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span
          onClick={() => navigate('/')}
          className="font-medium text-gray-700 cursor-pointer hover:text-gray-900"
        >
          Language Reader
        </span>
        <div className="flex items-center gap-5">
          <LanguageDropdown />
          <button
            onClick={() => setShowSettings(true)}
            className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            Settings
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            Log out
          </button>
        </div>
      </nav>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  )
}

export default Nav

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearToken } from '../api.js'
import SettingsModal from './SettingsModal.jsx'

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
        <div className="flex items-center gap-4">
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

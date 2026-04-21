import { useNavigate } from 'react-router-dom'
import { clearToken } from '../api.js'

function Nav() {
  const navigate = useNavigate()

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <span className="font-medium text-gray-700">Language Reader</span>
      <button
        onClick={handleLogout}
        className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
      >
        Log out
      </button>
    </nav>
  )
}

export default Nav

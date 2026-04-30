import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { BookIcon, PlayIcon, FlashcardsIcon, UploadIcon, BarChartIcon, ChevronIcon } from './Icons.jsx'

function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(true)

  // Track last visited lesson so "Now Reading" can return to it
  useEffect(() => {
    if (/\/courses\/\d+\/lessons\/\d+/.test(location.pathname)) {
      localStorage.setItem('lastLesson', location.pathname)
    }
  }, [location.pathname])

  const lastLesson = localStorage.getItem('lastLesson')
  const isOnLesson = /\/courses\/\d+\/lessons\/\d+/.test(location.pathname)

  const NAV_ITEMS = [
    {
      label: 'Library',
      icon: <BookIcon />,
      active: !isOnLesson && location.pathname !== '/flashcards',
      onClick: () => navigate('/'),
    },
    {
      label: 'Now Reading',
      icon: <PlayIcon />,
      active: isOnLesson,
      disabled: !lastLesson && !isOnLesson,
      onClick: lastLesson ? () => navigate(lastLesson) : undefined,
    },
    {
      label: 'Flashcards',
      icon: <FlashcardsIcon />,
      active: location.pathname === '/flashcards',
      onClick: () => navigate('/flashcards'),
    },
    { label: 'Upload Audio', icon: <UploadIcon />,     disabled: true },
    { label: 'Progress',     icon: <BarChartIcon />,   disabled: true },
  ]

  return (
    <aside
      className={`${collapsed ? 'w-14' : 'w-52'} shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-200 overflow-hidden`}
    >
      <nav className="flex-1 px-2 pt-3 flex flex-col gap-0.5">
        {NAV_ITEMS.map(item => (
          <button
            key={item.label}
            title={collapsed ? item.label : undefined}
            onClick={item.disabled ? undefined : item.onClick}
            className={[
              'flex items-center gap-3 rounded-lg text-sm w-full transition-colors',
              collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2',
              item.active
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : item.disabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800 cursor-pointer',
            ].join(' ')}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="px-2 py-3 border-t border-gray-200">
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand' : 'Collapse'}
          className={`flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 cursor-pointer rounded-lg py-2 transition-colors w-full ${collapsed ? 'justify-center px-0' : 'px-3'}`}
        >
          <ChevronIcon collapsed={collapsed} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar

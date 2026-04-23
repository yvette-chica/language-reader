import { createContext, useContext, useState, useEffect } from 'react'
import { api, isLoggedIn } from './api.js'

export const LANGUAGES = [
  { code: 'en', name: 'English',   flag: '🇬🇧' },
  { code: 'de', name: 'German',    flag: '🇩🇪' },
  { code: 'fr', name: 'French',    flag: '🇫🇷' },
  { code: 'es', name: 'Spanish',   flag: '🇪🇸' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
]

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [activeLanguage, setActiveLanguageState] = useState('de')

  useEffect(() => {
    if (!isLoggedIn()) return
    api.get('/settings')
      .then(s => { if (s.active_language) setActiveLanguageState(s.active_language) })
      .catch(() => {})
  }, [])

  async function setActiveLanguage(code) {
    setActiveLanguageState(code)
    try {
      await api.patch('/settings', { active_language: code })
    } catch (err) {
      console.error('Failed to save active language:', err)
    }
  }

  return (
    <LanguageContext.Provider value={{ activeLanguage, setActiveLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

import { useState, useEffect } from 'react'
import { api } from '../api.js'

const SERVICE_OPTIONS = [
  { value: 'mymemory', label: 'MyMemory — free, no API key required' },
  { value: 'pons',     label: 'PONS — dictionary definitions (free API key required)' },
  { value: 'deepl',   label: 'DeepL — high-quality translation (free API key required)' },
  { value: 'none',    label: 'None — save words without auto-translation' },
]

function SettingsModal({ onClose }) {
  const [settings, setSettings] = useState(null)
  const [service, setService] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/settings')
      .then(data => {
        setSettings(data)
        setService(data.lookup_service)
      })
      .catch(err => setError(err.message))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const updated = await api.patch('/settings', { lookup_service: service })
      setSettings(updated)
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer text-xl leading-none"
          >
            ×
          </button>
        </div>

        {!settings ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Word lookup service
              </label>
              <select
                value={service}
                onChange={e => { setService(e.target.value); setSaved(false) }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {SERVICE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-gray-400">
                API keys for PONS and DeepL are added to <code className="bg-gray-100 px-1 rounded">server/.env</code>.
              </p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 cursor-pointer"
              >
                {saving ? '...' : 'Save'}
              </button>
              {saved && <span className="text-sm text-green-600">Saved!</span>}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default SettingsModal

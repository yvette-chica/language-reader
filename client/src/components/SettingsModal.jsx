import { useState, useEffect } from 'react'
import { api } from '../api.js'

const SERVICE_OPTIONS = [
  { value: 'mymemory', label: 'MyMemory — free, no API key required' },
  { value: 'pons',     label: 'PONS — dictionary definitions (free API key required)' },
  { value: 'deepl',   label: 'DeepL — high-quality translation (free API key required)' },
  { value: 'none',    label: 'None — save words without auto-translation' },
]

const LAYOUT_OPTIONS = [
  { value: 'stack', label: 'Stack', description: 'Video above transcript, lookup panel on the side' },
  { value: 'split', label: 'Split', description: 'Transcript on the left, video and lookup on the right (resizable)' },
  { value: 'focus', label: 'Focus', description: 'Transcript only, no video shown' },
]

function SettingsModal({ onClose }) {
  const [settings, setSettings] = useState(null)
  const [service, setService] = useState('')
  const [layout, setLayout] = useState('stack')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/settings')
      .then(data => {
        setSettings(data)
        setService(data.lookup_service)
        setLayout(data.lesson_layout ?? 'stack')
      })
      .catch(err => setError(err.message))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await api.patch('/settings', { lookup_service: service, lesson_layout: layout })
      window.dispatchEvent(new CustomEvent('settings-updated', { detail: updated }))
      onClose()
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
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Word lookup service
              </label>
              <select
                value={service}
                onChange={e => setService(e.target.value)}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lesson layout
              </label>
              <div className="flex flex-col gap-2">
                {LAYOUT_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      layout === opt.value
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="layout"
                      value={opt.value}
                      checked={layout === opt.value}
                      onChange={() => setLayout(opt.value)}
                      className="mt-0.5 accent-indigo-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-700">{opt.label}</p>
                      <p className="text-xs text-gray-400">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
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
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default SettingsModal

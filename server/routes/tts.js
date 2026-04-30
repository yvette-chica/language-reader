import { Router } from 'express'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const router = Router()

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const PYTHON     = path.join(__dirname, '..', '.venv', 'bin', 'python')
const TTS_SCRIPT = path.join(__dirname, '..', 'services', 'tts.py')

// BCP-47 → ISO 639-1 for gTTS
const LANG_MAP = {
  'en-US': 'en', 'de-DE': 'de', 'fr-FR': 'fr', 'es-ES': 'es', 'hu-HU': 'hu',
}

// GET /api/tts?text=…&lang=de-DE
router.get('/', (req, res) => {
  const { text, lang } = req.query
  if (!text || !lang) return res.status(400).json({ error: 'text and lang are required' })

  const gttsLang = LANG_MAP[lang] ?? lang.split('-')[0]
  const proc = spawn(PYTHON, [TTS_SCRIPT, text, gttsLang])

  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('Cache-Control', 'public, max-age=86400')

  proc.stdout.pipe(res)

  let stderr = ''
  proc.stderr.on('data', d => { stderr += d.toString() })

  proc.on('error', err => {
    console.error('[tts] spawn error:', err.message)
    if (!res.headersSent) res.status(500).json({ error: 'TTS unavailable' })
  })

  proc.on('close', code => {
    if (code !== 0) {
      console.error(`[tts] exited ${code}: ${stderr}`)
      if (!res.headersSent) res.status(500).json({ error: 'TTS script failed' })
    }
  })
})

export default router

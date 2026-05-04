import { Router } from 'express'
import db from '../db/database.js'
import requireAuth from '../middleware/auth.js'

const router = Router()

// GET /api/lessons/recent?language=de — last 15 visited lessons for a language
router.get('/recent', requireAuth, (req, res) => {
  const { language } = req.query
  if (!language) return res.status(400).json({ error: 'language is required' })

  const lessons = db.prepare(`
    SELECT
      l.id,
      l.title,
      l.type,
      l.audio_url,
      l.thumbnail_url,
      l.last_visited_at,
      c.id    AS course_id,
      c.title AS course_title
    FROM lessons l
    JOIN courses c ON l.course_id = c.id
    WHERE c.user_id = ?
      AND c.language = ?
      AND l.last_visited_at IS NOT NULL
    ORDER BY l.last_visited_at DESC
    LIMIT 15
  `).all(req.user.id, language)

  res.json(lessons)
})

export default router

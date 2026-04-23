import { Router } from 'express';
import db from '../db/database.js';
import requireAuth from '../middleware/auth.js';

const router = Router();

const VALID_SERVICES  = ['mymemory', 'pons', 'deepl', 'none'];
const VALID_LANGUAGES = ['en', 'de', 'fr', 'es', 'hu'];

// GET /api/settings — return current user settings
router.get('/', requireAuth, (req, res) => {
  const settings = db.prepare(
    'SELECT source_language, active_language, lookup_service FROM users WHERE id = ?'
  ).get(req.user.id);

  // Tell the frontend which services are usable right now
  const available_services = ['mymemory'];
  if (process.env.PONS_API_KEY)  available_services.push('pons');
  if (process.env.DEEPL_API_KEY) available_services.push('deepl');

  res.json({ ...settings, available_services });
});

// PATCH /api/settings — update user settings
router.patch('/', requireAuth, (req, res) => {
  const { lookup_service, active_language } = req.body;

  if (lookup_service !== undefined && !VALID_SERVICES.includes(lookup_service)) {
    return res.status(400).json({ error: `lookup_service must be one of: ${VALID_SERVICES.join(', ')}` });
  }
  if (active_language !== undefined && !VALID_LANGUAGES.includes(active_language)) {
    return res.status(400).json({ error: `active_language must be one of: ${VALID_LANGUAGES.join(', ')}` });
  }

  db.prepare(`
    UPDATE users SET
      lookup_service  = COALESCE(?, lookup_service),
      active_language = COALESCE(?, active_language)
    WHERE id = ?
  `).run(lookup_service ?? null, active_language ?? null, req.user.id);

  const updated = db.prepare(
    'SELECT source_language, active_language, lookup_service FROM users WHERE id = ?'
  ).get(req.user.id);

  res.json(updated);
});

export default router;

import { Router } from 'express';
import db from '../db/database.js';
import requireAuth from '../middleware/auth.js';
import { lookup as myMemoryLookup } from '../services/lookup/mymemory.js';
import { lookup as ponsLookup } from '../services/lookup/pons.js';
import { lookup as deeplLookup } from '../services/lookup/deepl.js';

const router = Router();

const VALID_SERVICES = ['mymemory', 'pons', 'deepl', 'none'];

// GET /api/lookup?word=Apfel&language=de&service=pons
// service param overrides the user's default; falls back to user's configured service.
// Returns: { translation, definition, examples: [{ source, target }] }
router.get('/', requireAuth, async (req, res) => {
  const { word, language } = req.query;

  if (!word || !language) {
    return res.status(400).json({ error: 'word and language are required' });
  }

  const user = db.prepare(
    'SELECT source_language, lookup_service FROM users WHERE id = ?'
  ).get(req.user.id);

  const { source_language: sourceLang } = user;
  const service = VALID_SERVICES.includes(req.query.service) ? req.query.service : user.lookup_service;

  try {
    let result;

    if (service === 'mymemory') {
      result = await myMemoryLookup(word, language, sourceLang);
    } else if (service === 'pons') {
      if (!process.env.PONS_API_KEY) {
        return res.status(503).json({ error: 'PONS API key not configured in .env' });
      }
      result = await ponsLookup(word, language, sourceLang, process.env.PONS_API_KEY);
    } else if (service === 'deepl') {
      if (!process.env.DEEPL_API_KEY) {
        return res.status(503).json({ error: 'DeepL API key not configured in .env' });
      }
      result = await deeplLookup(word, language, sourceLang, process.env.DEEPL_API_KEY);
    } else {
      // service === 'none'
      result = { translation: null, definition: null, examples: [] };
    }

    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

export default router;

import { Router } from 'express';
import db from '../db/database.js';
import requireAuth from '../middleware/auth.js';

const router = Router();

const VALID_STATUSES = ['unknown', 'recognized', 'familiar', 'learned'];

// GET /api/words — get all words for the logged-in user
router.get('/', requireAuth, (req, res) => {
  const words = db.prepare(`
    SELECT * FROM words WHERE user_id = ? ORDER BY saved_at DESC
  `).all(req.user.id);

  const parsed = words.map(w => ({
    ...w,
    attributes: w.attributes ? JSON.parse(w.attributes) : null,
  }));

  res.json(parsed);
});

// POST /api/words — save a new word
router.post('/', requireAuth, (req, res) => {
  const { word, language, source_language, translation, context, lesson_id, attributes } = req.body;

  if (!word || !language || !source_language) {
    return res.status(400).json({ error: 'word, language, and source_language are required' });
  }

  const result = db.prepare(`
    INSERT INTO words (user_id, lesson_id, word, language, translation, source_language, context, attributes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    lesson_id ?? null,
    word,
    language,
    translation ?? null,
    source_language,
    context ?? null,
    attributes ? JSON.stringify(attributes) : null,
  );

  const saved = db.prepare('SELECT * FROM words WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    ...saved,
    attributes: saved.attributes ? JSON.parse(saved.attributes) : null,
  });
});

// PATCH /api/words/:wordId — update a word
router.patch('/:wordId', requireAuth, (req, res) => {
  const word = db.prepare('SELECT * FROM words WHERE id = ? AND user_id = ?').get(req.params.wordId, req.user.id);
  if (!word) {
    return res.status(404).json({ error: 'Word not found' });
  }

  const { status, translation, attributes } = req.body;

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  db.prepare(`
    UPDATE words SET
      status      = COALESCE(?, status),
      translation = COALESCE(?, translation),
      attributes  = COALESCE(?, attributes)
    WHERE id = ?
  `).run(
    status ?? null,
    translation ?? null,
    attributes ? JSON.stringify(attributes) : null,
    req.params.wordId,
  );

  const updated = db.prepare('SELECT * FROM words WHERE id = ?').get(req.params.wordId);

  res.json({
    ...updated,
    attributes: updated.attributes ? JSON.parse(updated.attributes) : null,
  });
});

// DELETE /api/words/:wordId — delete a word
router.delete('/:wordId', requireAuth, (req, res) => {
  const word = db.prepare('SELECT * FROM words WHERE id = ? AND user_id = ?').get(req.params.wordId, req.user.id);
  if (!word) {
    return res.status(404).json({ error: 'Word not found' });
  }

  db.prepare('DELETE FROM words WHERE id = ?').run(req.params.wordId);

  res.status(204).send();
});

export default router;

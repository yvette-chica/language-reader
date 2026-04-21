import { Router } from 'express';
import db from '../db/database.js';
import requireAuth from '../middleware/auth.js';

const router = Router();

// GET /api/courses — get all courses for the logged-in user
router.get('/', requireAuth, (req, res) => {
  const courses = db.prepare(`
    SELECT * FROM courses WHERE user_id = ? ORDER BY created_at DESC
  `).all(req.user.id);

  res.json(courses);
});

// POST /api/courses — create a new course for the logged-in user
router.post('/', requireAuth, (req, res) => {
  const { title, language, theme, description } = req.body;

  // 1. Validate required fields
  if (!title || !language) {
    return res.status(400).json({ error: 'Title and language are required' });
  }

  // 2. Insert the new course
  const result = db.prepare(`
    INSERT INTO courses (user_id, title, language, theme, description)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.user.id, title, language, theme ?? null, description ?? null);

  // 3. Fetch and return the newly created course
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json(course);
});

// PATCH /api/courses/:courseId — update a course title
router.patch('/:courseId', requireAuth, (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?').get(req.params.courseId, req.user.id);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  db.prepare('UPDATE courses SET title = ? WHERE id = ?').run(title.trim(), req.params.courseId);

  const updated = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.courseId);
  res.json(updated);
});

// DELETE /api/courses/:courseId — delete a course
router.delete('/:courseId', requireAuth, (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?').get(req.params.courseId, req.user.id);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.courseId);
  res.status(204).send();
});

export default router;

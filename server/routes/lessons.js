import { Router } from 'express';
import db from '../db/database.js';
import requireAuth from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// Helper — fetch a course and verify it belongs to the logged-in user
function getCourseForUser(courseId, userId) {
  return db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?').get(courseId, userId);
}

// GET /api/courses/:courseId/lessons — get all lessons for a course
router.get('/', requireAuth, (req, res) => {
  const course = getCourseForUser(req.params.courseId, req.user.id);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const lessons = db.prepare(`
    SELECT * FROM lessons WHERE course_id = ? ORDER BY created_at ASC
  `).all(req.params.courseId);

  res.json(lessons);
});

// GET /api/courses/:courseId/lessons/:lessonId — get a single lesson
router.get('/:lessonId', requireAuth, (req, res) => {
  const course = getCourseForUser(req.params.courseId, req.user.id);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ? AND course_id = ?').get(req.params.lessonId, req.params.courseId);
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  res.json(lesson);
});

// POST /api/courses/:courseId/lessons — create a new lesson
router.post('/', requireAuth, (req, res) => {
  const course = getCourseForUser(req.params.courseId, req.user.id);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const { title, type, audio_url, audio_file_path, duration } = req.body;

  if (!title || !type) {
    return res.status(400).json({ error: 'Title and type are required' });
  }

  const result = db.prepare(`
    INSERT INTO lessons (course_id, title, type, audio_url, audio_file_path, duration)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.params.courseId, title, type, audio_url ?? null, audio_file_path ?? null, duration ?? null);

  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json(lesson);
});

export default router;

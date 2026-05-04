import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db/database.js';
import requireAuth from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname)
      cb(null, `lesson-${Date.now()}${ext}`)
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only image files are allowed'))
  },
  limits: { fileSize: 5 * 1024 * 1024 },
})

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
router.post('/', requireAuth, upload.single('thumbnail'), (req, res) => {
  const course = getCourseForUser(req.params.courseId, req.user.id);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const { title, type, audio_url, audio_file_path, duration } = req.body;

  if (!title || !type) {
    return res.status(400).json({ error: 'Title and type are required' });
  }

  const thumbnail_url = req.file ? `/uploads/${req.file.filename}` : null;

  const result = db.prepare(`
    INSERT INTO lessons (course_id, title, type, audio_url, audio_file_path, duration, thumbnail_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.courseId, title, type, audio_url ?? null, audio_file_path ?? null, duration ?? null, thumbnail_url);

  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json(lesson);
});

// POST /api/courses/:courseId/lessons/:lessonId/visit — record a visit timestamp
router.post('/:lessonId/visit', requireAuth, (req, res) => {
  const course = getCourseForUser(req.params.courseId, req.user.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const lesson = db.prepare('SELECT id FROM lessons WHERE id = ? AND course_id = ?').get(req.params.lessonId, req.params.courseId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  db.prepare(`UPDATE lessons SET last_visited_at = datetime('now') WHERE id = ?`).run(req.params.lessonId);
  res.status(204).send();
});

// PATCH /api/courses/:courseId/lessons/:lessonId — update a lesson title
router.patch('/:lessonId', requireAuth, (req, res) => {
  const course = getCourseForUser(req.params.courseId, req.user.id);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ? AND course_id = ?').get(req.params.lessonId, req.params.courseId);
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  db.prepare('UPDATE lessons SET title = ? WHERE id = ?').run(title.trim(), req.params.lessonId);

  const updated = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.lessonId);
  res.json(updated);
});

// DELETE /api/courses/:courseId/lessons/:lessonId — delete a lesson
router.delete('/:lessonId', requireAuth, (req, res) => {
  const course = getCourseForUser(req.params.courseId, req.user.id);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ? AND course_id = ?').get(req.params.lessonId, req.params.courseId);
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  db.prepare('DELETE FROM lessons WHERE id = ?').run(req.params.lessonId);
  res.status(204).send();
});

export default router;

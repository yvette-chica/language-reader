import { Router } from 'express';
import db from '../db/database.js';
import requireAuth from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// Helper — fetch a course and verify it belongs to the logged-in user
function getCourseForUser(courseId, userId) {
  return db.prepare('SELECT * FROM courses WHERE id = ? AND user_id = ?').get(courseId, userId);
}

// Helper — fetch a lesson and verify it belongs to the given course
function getLessonForCourse(lessonId, courseId) {
  return db.prepare('SELECT * FROM lessons WHERE id = ? AND course_id = ?').get(lessonId, courseId);
}

// GET /api/courses/:courseId/lessons/:lessonId/transcript
router.get('/', requireAuth, (req, res) => {
  const course = getCourseForUser(req.params.courseId, req.user.id);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const lesson = getLessonForCourse(req.params.lessonId, req.params.courseId);
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  const transcript = db.prepare('SELECT * FROM transcripts WHERE lesson_id = ?').get(req.params.lessonId);
  if (!transcript) {
    return res.status(404).json({ error: 'Transcript not found' });
  }

  res.json(transcript);
});

// POST /api/courses/:courseId/lessons/:lessonId/transcript
router.post('/', requireAuth, (req, res) => {
  const course = getCourseForUser(req.params.courseId, req.user.id);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const lesson = getLessonForCourse(req.params.lessonId, req.params.courseId);
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  const existing = db.prepare('SELECT * FROM transcripts WHERE lesson_id = ?').get(req.params.lessonId);
  if (existing) {
    return res.status(409).json({ error: 'Transcript already exists for this lesson' });
  }

  const result = db.prepare('INSERT INTO transcripts (lesson_id) VALUES (?)').run(req.params.lessonId);

  const transcript = db.prepare('SELECT * FROM transcripts WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json(transcript);
});

export default router;

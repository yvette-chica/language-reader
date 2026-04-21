import { Router } from 'express';
import db from '../db/database.js';
import requireAuth from '../middleware/auth.js';
import { transcribeLesson } from '../services/transcription.js';

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

  const segments = db.prepare(
    'SELECT * FROM transcript_segments WHERE transcript_id = ? ORDER BY sequence_order'
  ).all(transcript.id);

  res.json({ ...transcript, segments });
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

// Split text into sentences on . ! ? followed by a space and capital letter
function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÖŐÚÜŰ])/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// POST /api/courses/:courseId/lessons/:lessonId/transcript/manual
router.post('/manual', requireAuth, (req, res) => {
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

  const { text } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'text is required' });
  }

  const sentences = splitSentences(text.trim());

  const insertTranscript = db.prepare('INSERT INTO transcripts (lesson_id) VALUES (?)');
  const insertSegment = db.prepare(
    'INSERT INTO transcript_segments (transcript_id, sequence_order, start_time, end_time, text) VALUES (?, ?, ?, ?, ?)'
  );

  const insertAll = db.transaction((transcriptId) => {
    for (let i = 0; i < sentences.length; i++) {
      insertSegment.run(transcriptId, i, null, null, sentences[i]);
    }
  });

  const { lastInsertRowid: transcriptId } = insertTranscript.run(req.params.lessonId);
  insertAll(transcriptId);

  const transcript = db.prepare('SELECT * FROM transcripts WHERE id = ?').get(transcriptId);
  const segments = db.prepare(
    'SELECT * FROM transcript_segments WHERE transcript_id = ? ORDER BY sequence_order'
  ).all(transcriptId);

  res.status(201).json({ ...transcript, segments });
});

// POST /api/courses/:courseId/lessons/:lessonId/transcript/whisper
router.post('/whisper', requireAuth, async (req, res) => {
  const course = getCourseForUser(req.params.courseId, req.user.id);
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const lesson = getLessonForCourse(req.params.lessonId, req.params.courseId);
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  if (!lesson.audio_file_path && !lesson.audio_url) {
    return res.status(400).json({ error: 'Lesson has no audio source' });
  }

  const existing = db.prepare('SELECT * FROM transcripts WHERE lesson_id = ?').get(req.params.lessonId);
  if (existing) {
    return res.status(409).json({ error: 'Transcript already exists for this lesson' });
  }

  try {
    const segments = await transcribeLesson(lesson);

    const insertTranscript = db.prepare('INSERT INTO transcripts (lesson_id) VALUES (?)');
    const insertSegment = db.prepare(
      'INSERT INTO transcript_segments (transcript_id, sequence_order, start_time, end_time, text) VALUES (?, ?, ?, ?, ?)'
    );

    const insertAll = db.transaction((transcriptId) => {
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        insertSegment.run(transcriptId, i, seg.start_time, seg.end_time, seg.text);
      }
    });

    const { lastInsertRowid: transcriptId } = insertTranscript.run(req.params.lessonId);
    insertAll(transcriptId);

    const transcript = db.prepare('SELECT * FROM transcripts WHERE id = ?').get(transcriptId);
    const savedSegments = db.prepare(
      'SELECT * FROM transcript_segments WHERE transcript_id = ? ORDER BY sequence_order'
    ).all(transcriptId);

    res.status(201).json({ ...transcript, segments: savedSegments });
  } catch (err) {
    console.error('Whisper transcription error:', err);
    res.status(500).json({ error: 'Transcription failed', details: err.message });
  }
});

export default router;

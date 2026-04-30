import 'dotenv/config';
import express from 'express';
import db from './db/database.js';
import morgan from 'morgan';
import authRoutes from './routes/auth.js';
import coursesRoutes from './routes/courses.js';
import lessonsRoutes from './routes/lessons.js';
import transcriptsRoutes from './routes/transcripts.js';
import wordsRoutes from './routes/words.js';
import settingsRoutes from './routes/settings.js';
import lookupRoutes from './routes/lookup.js'
import ttsRoutes from './routes/tts.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Log requests to the console
app.use(morgan('dev'));

// Parse incoming JSON request bodies
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/courses/:courseId/lessons', lessonsRoutes);
app.use('/api/courses/:courseId/lessons/:lessonId/transcript', transcriptsRoutes);
app.use('/api/words', wordsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/lookup', lookupRoutes);
app.use('/api/tts', ttsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

import 'dotenv/config';
import express from 'express';
import db from './db/database.js';
import authRoutes from './routes/auth.js';
import coursesRoutes from './routes/courses.js';
import lessonsRoutes from './routes/lessons.js';
import transcriptsRoutes from './routes/transcripts.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Parse incoming JSON request bodies
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/courses/:courseId/lessons', lessonsRoutes);
app.use('/api/courses/:courseId/lessons/:lessonId/transcript', transcriptsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

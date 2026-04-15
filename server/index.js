import express from 'express';
import db from './db/database.js';

const app = express();
const PORT = 3001;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

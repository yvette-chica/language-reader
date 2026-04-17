import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db/database.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, source_language = 'en', active_language = 'de' } = req.body;

  // 1. Make sure email and password were provided
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // 2. Check if the email is already in use
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  // 3. Hash the password — 12 is the "cost factor", higher = slower = more secure
  const password_hash = await bcrypt.hash(password, 12);

  // 4. Insert the new user into the database
  const result = db.prepare(`
    INSERT INTO users (email, password_hash, source_language, active_language)
    VALUES (?, ?, ?, ?)
  `).run(email, password_hash, source_language, active_language);

  // 5. Generate a JWT token with the user's id and email inside it
  const token = jwt.sign(
    { id: result.lastInsertRowid, email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({ token });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // 1. Make sure email and password were provided
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // 2. Look up the user by email
  const user = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // 3. Check the password against the stored hash
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // 4. Generate a JWT token and return it
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token });
});

export default router;

import jwt from 'jsonwebtoken';

export default function requireAuth(req, res, next) {
  // 1. Grab the Authorization header — expected format: "Bearer <token>"
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // 2. Verify the token — if invalid or expired, jwt.verify throws an error
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // 3. Attach the user info to the request so route handlers can use it
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

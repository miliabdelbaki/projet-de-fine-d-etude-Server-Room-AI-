
import jwt from 'jsonwebtoken';

export function signToken(payload, opts = {}) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '7d',
    ...opts,
  });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ code: 'no_token', message: 'Token manquant' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { uid, role, email, iat, exp }
    next();
  } catch (e) {
    return res.status(401).json({ code: 'invalid_token', message: 'Token invalide' });
  }
}

export function requireAdmin(req, res, next) {
  // Ensure user is authenticated first, then check role
  return requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ code: 'forbidden', message: 'Accès réservé aux administrateurs' });
    return next();
  });
}

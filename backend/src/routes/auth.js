
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendResetEmail } from '../utils/email.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Helpers
function isEmail(v = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).toLowerCase());
}
function isStrongPassword(p = '') {
  return typeof p === 'string' && p.length >= 8;
}

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { email, password, role = 'technicien', displayName } = req.body || {};

    // Debug logging
    console.log('📝 Register attempt:', { email, passwordLength: password?.length, role, displayName });

    // Validate email
    if (!email || typeof email !== 'string' || email.trim() === '') {
      console.warn('❌ Email manquant ou vide');
      return res.status(400).json({ code: 'bad_request', message: 'Email requis' });
    }
    if (!isEmail(email)) {
      console.warn('❌ Email invalide:', email);
      return res.status(400).json({ code: 'bad_request', message: 'Email invalide (format: user@domain.com)' });
    }

    // Validate password
    if (!password || typeof password !== 'string' || password.trim() === '') {
      console.warn('❌ Mot de passe manquant ou vide');
      return res.status(400).json({ code: 'bad_request', message: 'Mot de passe requis' });
    }
    if (!isStrongPassword(password)) {
      console.warn('❌ Mot de passe invalide - min 8 chars, reçu:', password?.length);
      return res.status(400).json({ code: 'bad_request', message: 'Mot de passe doit avoir minimum 8 caractères' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ code: 'email_exists', message: 'E‑mail déjà utilisé' });

    const passwordHash = await bcrypt.hash(password, 12);

    // If role is technicien, require admin approval before they can login
    const approved = role === 'technicien' ? false : true;

    await User.create({
      email,
      passwordHash,
      role,
      displayName,
      approved,
    });

    return res.status(201).json({ message: 'Compte créé.' });
  } catch (e) {
    console.error('register:', e);
    return res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password, onlyTechnician = false } = req.body || {};
    if (!isEmail(email) || typeof password !== 'string') {
      return res.status(400).json({ code: 'bad_request', message: 'Email/mot de passe requis' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ code: 'user_not_found', message: 'Identifiants incorrects' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ code: 'wrong_password', message: 'Identifiants incorrects' });

    // If onlyTechnician is true, user MUST be a technician
    if (onlyTechnician && user.role !== 'technicien') {
      return res.status(403).json({ code: 'not_technician', message: 'Accès réservé aux techniciens' });
    }

    // If user is a technician, ensure admin approved the account before allowing login
    // Admins and other roles are automatically approved
    if (user.role === 'technicien' && user.approved !== true) {
      return res.status(403).json({ code: 'not_approved', message: 'Compte technicien en attente de validation par un administrateur' });
    }

    const token = signToken({ uid: user._id.toString(), role: user.role, email: user.email });

    // Log token server-side for debugging (do not do this in production)
    console.log('🔐 Login token generated for', user.email, token);

    // Expose token also in Authorization header for clients that read headers
    res.setHeader('Authorization', `Bearer ${token}`);

    return res.json({
      token,
      user: { id: user._id, email: user.email, role: user.role, displayName: user.displayName },
    });
  } catch (e) {
    console.error('login:', e);
    return res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// ME (protected)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.uid).lean();
    if (!user) return res.status(404).json({ code: 'user_not_found' });
    return res.json({
      role: user.role,
      email: user.email,
      displayName: user.displayName,
    });
  } catch (e) {
    console.error('me:', e);
    return res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// PROFILE (compatibilité frontend: retourne { user: { ... } })
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.uid).lean();
    if (!user) return res.status(404).json({ code: 'user_not_found' });
    return res.json({ user: { id: user._id, email: user.email, role: user.role, displayName: user.displayName } });
  } catch (e) {
    console.error('profile:', e);
    return res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// FORGOT PASSWORD
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!isEmail(email)) return res.status(200).json({ message: 'Si le compte existe, un e‑mail a été envoyé.' });

    const user = await User.findOne({ email });
    if (!user) return res.status(200).json({ message: 'Si le compte existe, un e‑mail a été envoyé.' });

    const token = crypto.randomBytes(24).toString('hex');
    user.resetToken = token;
    user.resetExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    if (process.env.SMTP_USER !== 'your-email@gmail.com') {
      await sendResetEmail(email, token);
      console.log('✉️  Email de reset envoyé à:', email);
    } else {
      console.log('⏭️  Envoi d\'email désactivé. Lien reset:', `${process.env.CLIENT_URL}/reset-password?token=${token}`);
    }
    return res.json({ message: 'E‑mail envoyé s’il existe.' });
  } catch (e) {
    console.error('forgot:', e);
    return res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// RESET PASSWORD
router.post('/reset', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !isStrongPassword(newPassword)) {
      return res.status(400).json({ code: 'bad_request', message: 'Paramètres invalides' });
    }

    const user = await User.findOne({
      resetToken: token,
      resetExpires: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ code: 'invalid_token', message: 'Lien invalide/expiré' });

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetToken = undefined;
    user.resetExpires = undefined;
    await user.save();

    return res.json({ message: 'Mot de passe mis à jour' });
  } catch (e) {
    console.error('reset:', e);
    return res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

export default router;

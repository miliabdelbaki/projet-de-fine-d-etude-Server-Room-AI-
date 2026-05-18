import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendResetEmail } from '../utils/email.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ================= HELPERS =================
function isEmail(v = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).toLowerCase());
}

function isStrongPassword(p = '') {
  return typeof p === 'string' && p.length >= 8;
}

// ================= REGISTER =================
router.post('/register', async (req, res) => {
  try {
    const { email, password, role = 'employe', displayName } = req.body || {};

    if (!email || !isEmail(email)) {
      return res.status(400).json({ message: 'Email invalide' });
    }

    if (!password || !isStrongPassword(password)) {
      return res.status(400).json({ message: 'Mot de passe min 8 caractères' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: 'Email déjà utilisé' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // 👇 IMPORTANT
    const approved = false; // tous les comptes validés par admin

    await User.create({
      email,
      passwordHash,
      role,
      displayName,
      approved,
    });

    return res.status(201).json({
      message: 'Compte créé. En attente de validation admin.',
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ================= LOGIN =================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    //  Vérification admin
    if (!user.approved) {
      return res.status(403).json({
        message: 'Compte en attente de validation par admin',
      });
    }

    const token = signToken({
      uid: user._id.toString(),
      role: user.role,
      email: user.email,
    });

    return res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
      },
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});




router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.uid).lean();
    if (!user) return res.status(404).json({ message: 'Introuvable' });
    return res.json({ id: user._id, email: user.email, role: user.role, displayName: user.displayName });
  } catch (e) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;
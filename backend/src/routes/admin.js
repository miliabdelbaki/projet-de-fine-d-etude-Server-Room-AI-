import express from 'express';
import User from '../models/User.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// List users (admin)
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('email displayName role approved createdAt').lean();
    res.json(users);
  } catch (e) {
    console.error('admin:users', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// Update user role (admin)
router.put('/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body || {};
    if (!role) return res.status(400).json({ code: 'bad_request', message: 'Role requis' });
    const valid = ['technicien', 'admin', 'user'];
    if (!valid.includes(role)) return res.status(400).json({ code: 'bad_request', message: 'Role invalide' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('email displayName role').lean();
    if (!user) return res.status(404).json({ code: 'not_found' });
    res.json(user);
  } catch (e) {
    console.error('admin:set-role', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// Delete user (admin)
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Utilisateur supprimé' });
  } catch (e) {
    console.error('admin:delete-user', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// Approve or reject a user (admin)
router.put('/users/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { approved = true } = req.body || {};
    const user = await User.findByIdAndUpdate(req.params.id, { approved }, { new: true }).select('email displayName role approved').lean();
    if (!user) return res.status(404).json({ code: 'not_found' });
    res.json(user);
  } catch (e) {
    console.error('admin:approve-user', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

export default router;


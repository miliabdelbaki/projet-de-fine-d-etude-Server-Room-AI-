import express from 'express';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Verification from '../models/Verification.js';
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

// Get dashboard stats
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalRooms, totalVerifications, verifications] = await Promise.all([
      User.countDocuments(),
      Room.countDocuments(),
      Verification.countDocuments(),
      Verification.find({}, 'createdAt submittedAt status').lean()
    ]);

    // Get current week (Monday to Sunday)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
    endOfWeek.setHours(23, 59, 59, 999);

    // Count verifications per day of the week (submitted verifications if possible, else created)
    const weekDays = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
    const dailyCounts = Array(7).fill(0);
    verifications.forEach(v => {
      // Use submittedAt if available and verification is submitted, otherwise use createdAt
      const dateToCount = (v.status === 'submitted' && v.submittedAt) ? v.submittedAt : v.createdAt;
      const date = new Date(dateToCount);
      if (date >= startOfWeek && date <= endOfWeek) {
        const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1; // 0=Sunday -> 6, 1=Monday -> 0, etc.
        dailyCounts[dayIndex]++;
      }
    });

    const latestVerifications = await Verification.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('room', 'name')
      .populate('technician', 'displayName')
      .lean();

    const formattedActivity = latestVerifications.map((v) => ({
      id: v._id,
      room: v.room?.name || 'Salle inconnue',
      technician: v.technician?.displayName || 'Inconnu',
      status: v.status || 'inconnu',
      createdAt: v.createdAt,
      text: `Salle ${v.room?.name || '…'} — Vérification ${v.status || 'inconnue'} par ${v.technician?.displayName || 'technicien'}`,
      // ✅ AJOUT: Inclure les items avec les images et notes
      items: Array.isArray(v.items) ? v.items.map(item => {
        // Ensure photo has proper data URL format
        let photoUrl = null;
        if (item.photo) {
          if (item.photo.startsWith('data:')) {
            photoUrl = item.photo;
          } else {
            // Raw Base64 without prefix - add it
            photoUrl = `data:image/jpeg;base64,${item.photo}`;
          }
        }
        return {
          label: item.label,
          completed: item.completed,
          photo: photoUrl,  // Image en Base64 avec préfixe data URL
          notes: item.notes || item.comment || ''  // Notes ou commentaires
        };
      }) : []
    }));

    const systemStatus = [
      { name: 'CPU_LOAD', pct: Math.round(25 + Math.random() * 45), color: '#00e676' },
      { name: 'RAM_USAGE', pct: Math.round(35 + Math.random() * 55), color: '#ff6f00' },
      { name: 'DISK_IO', pct: Math.round(15 + Math.random() * 45), color: '#00e676' },
      { name: 'RÉSEAU', pct: Math.round(20 + Math.random() * 60), color: '#00b4d8' },
      { name: 'TEMP_MOY', pct: Math.round(30 + Math.random() * 50), color: '#00e676' }
    ].map((item) => {
      const badge = item.pct >= 80 ? 'crit' : item.pct >= 60 ? 'warn' : 'ok';
      return { ...item, badge };
    });

    res.json({
      totalUsers,
      totalRooms,
      totalVerifications,
      weeklyVerifications: dailyCounts,
      activity: formattedActivity,
      systemStatus
    });
  } catch (e) {
    console.error('admin:stats', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

export default router;


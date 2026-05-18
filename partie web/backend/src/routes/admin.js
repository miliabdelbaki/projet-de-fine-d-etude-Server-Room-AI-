import express from 'express';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Verification from '../models/Verification.js';
import MaintenanceNote from '../models/MaintenanceNote.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Debug endpoint to check what data exists
router.get('/debug/data', requireAuth, requireAdmin, async (req, res) => {
  try {
    const technicianCount = await User.countDocuments({ role: 'technicien' });
    const allUsersCount = await User.countDocuments();
    const maintenanceNotesCount = await MaintenanceNote.countDocuments();
    const verificationsCount = await Verification.countDocuments();
    
    const technicians = await User.find({ role: 'technicien' }).select('displayName email approved').lean();
    const allUsers = await User.find().select('_id displayName email role').lean();
    const maintenanceNotes = await MaintenanceNote.find().select('assignedTechnician status').limit(5).lean();
    
    res.json({
      technicianCount,
      allUsersCount,
      maintenanceNotesCount,
      verificationsCount,
      technicians,
      recentUsers: allUsers.slice(0, 10),
      recentMaintenanceNotes: maintenanceNotes
    });
  } catch (e) {
    console.error('admin:debug', e);
    res.status(500).json({ code: 'server_error', message: e.message });
  }
});

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
// Dans la route qui assigne un technicien à une note de maintenance
// (route admin existante ou à créer)

router.put('/maintenance-notes/:noteId/assign', requireAuth, requireAdmin, 
  async (req, res) => {
    const { technicianId } = req.body;
    
    const note = await MaintenanceNote.findByIdAndUpdate(
      req.params.noteId,
      { assignedTechnician: technicianId, status: 'EN_ATTENTE' },
      { new: true }
    ).populate('room', 'name');
    
    // Récupérer le token FCM du technicien
    const technician = await User.findById(technicianId).lean();
    
    if (technician?.fcmToken) {
      await sendPushNotification(technician.fcmToken, {
        title: "🔧 Nouvelle intervention assignée",
        body: `Panne détectée dans la salle ${note.room?.name}. Priorité : ${note.priority}`,
        data: { 
          type: 'new_intervention',
          noteId: note._id.toString() 
        }
      });
    }
    
    res.json(note);
  }
);

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
      .populate('employee', 'displayName')
      .lean();

    const formattedActivity = latestVerifications.map((v) => ({
      id: v._id,
      room: v.room?.name || 'Salle inconnue',
      employee: v.employee?.displayName || 'Inconnu',
      technician: v.employee?.displayName || 'Inconnu', // keep for backwards compatibility if frontend needs it
      status: v.status || 'inconnu',
      createdAt: v.createdAt,
      text: `Salle ${v.room?.name || '…'} — Vérification ${v.status || 'inconnue'} par ${v.employee?.displayName || 'employé'}`,
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

// Get technicians stats with interventions by status
router.get('/technicians-stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Get all users with role 'technicien'
    const technicians = await User.find({ role: 'technicien' }).select('_id displayName approved').lean();
    console.log('✅ Techniciens trouvés:', technicians.length, technicians.map(t => t.displayName));
    
    // Get ALL maintenance notes to see what's in the database
    const allMaintenanceNotes = await MaintenanceNote.find().select('assignedTechnician status').lean();
    console.log('✅ TOUTES les MaintenanceNotes (count):', allMaintenanceNotes.length);
    console.log('📋 Aperçu MaintenanceNotes:', allMaintenanceNotes.slice(0, 5));
    
    // If no technicians with role 'technicien', try to get all users and filter by those with maintenance notes
    let techniciansList = technicians;
    if (technicians.length === 0) {
      console.log('⚠️ Aucun technicien trouvé avec role="technicien"');
      // Get all users who have maintenance notes assigned
      const usersWithMaintenance = await User.find({
        _id: { $in: allMaintenanceNotes.map(m => m.assignedTechnician).filter(Boolean) }
      }).select('_id displayName approved role').lean();
      console.log('📌 Utilisateurs avec MaintenanceNotes:', usersWithMaintenance.length);
      techniciansList = usersWithMaintenance;
    }
    
    // Get all verifications for technicians
    const verifications = await Verification.find({
      employee: { $in: techniciansList.map(t => t._id) }
    }).select('employee status').lean();
    console.log('✅ Vérifications trouvées:', verifications.length);
    
    // Get all maintenance notes for these technicians
    const maintenanceNotes = await MaintenanceNote.find({
      assignedTechnician: { $in: techniciansList.map(t => t._id) }
    }).select('assignedTechnician status').lean();
    console.log('✅ MaintenanceNotes assignées:', maintenanceNotes.length);
    
    // Group by technician with both verification and maintenance statuses
    const technicianStats = techniciansList.map(tech => {
      // Verification counts
      const techVerifications = verifications.filter(v => v.employee?.toString() === tech._id.toString());
      const verificationStatuses = {
        draft: 0,
        submitted: 0,
        validated: 0,
        completed: 0,
        incomplete: 0
      };
      
      techVerifications.forEach(v => {
        if (verificationStatuses.hasOwnProperty(v.status)) {
          verificationStatuses[v.status]++;
        }
      });
      
      // Maintenance intervention counts
      const techMaintenanceNotes = maintenanceNotes.filter(m => m.assignedTechnician?.toString() === tech._id.toString());
      const maintenanceStatuses = {
        'EN_ATTENTE': 0,
        'EN_COURS': 0,
        'TERMINEE': 0
      };
      
      techMaintenanceNotes.forEach(m => {
        if (maintenanceStatuses.hasOwnProperty(m.status)) {
          maintenanceStatuses[m.status]++;
        }
      });
      
      return {
        id: tech._id,
        name: tech.displayName || 'Sans nom',
        status: tech.approved ? 'Approuvé' : 'En attente',
        isApproved: tech.approved,
        // Vérifications
        draft: verificationStatuses.draft,
        submitted: verificationStatuses.submitted,
        validated: verificationStatuses.validated,
        completed: verificationStatuses.completed,
        incomplete: verificationStatuses.incomplete,
        totalVerifications: techVerifications.length,
        // Interventions de maintenance
        enAttente: maintenanceStatuses['EN_ATTENTE'],
        enCours: maintenanceStatuses['EN_COURS'],
        terminee: maintenanceStatuses['TERMINEE'],
        totalInterventions: techMaintenanceNotes.length
      };
    });
    
    // Filter technicians with at least one verification or intervention
    const filtered = technicianStats.filter(tech => tech.totalVerifications > 0 || tech.totalInterventions > 0);
    
    console.log('📊 Techniciens filtrés (avec interventions):', filtered.length);
    console.log('📊 Données finales:', JSON.stringify(filtered, null, 2));
    
    res.json(filtered);
  } catch (e) {
    console.error('admin:technicians-stats', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur: ' + e.message });
  }
});

export default router;
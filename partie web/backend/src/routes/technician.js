import express from 'express';
import MaintenanceNote from '../models/MaintenanceNote.js';
import Verification from '../models/Verification.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';


const router = express.Router();

// ── Middleware : s'assurer que l'utilisateur est un technicien
function requireTechnician(req, res, next) {
  if (req.user?.role !== 'technicien') {
    return res.status(403).json({ code: 'forbidden', message: 'Accès réservé aux techniciens' });
  }
  next();
}

// ═══════════════════════════════════════════════════════════
// GET /api/technician/interventions
// Liste toutes les interventions assignées au technicien connecté
// ═══════════════════════════════════════════════════════════
router.get('/interventions', requireAuth, requireTechnician, async (req, res) => {
  try {
    const userId = (req.user?.uid || req.user?.id)?.toString();
    
    const notes = await MaintenanceNote.find({ assignedTechnician: userId })
      .populate('room', 'name description')
      .populate('verification')
      .populate('admin', 'displayName email')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json(notes);
  } catch (e) {
    console.error('technician:interventions', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// GET /api/technician/interventions/:noteId
// Détails d'une intervention avec photos et historique complet
// ═══════════════════════════════════════════════════════════
router.get('/interventions/:noteId', requireAuth, requireTechnician, async (req, res) => {
  try {
    const userId = (req.user?.uid || req.user?.id)?.toString();
    
    const note = await MaintenanceNote.findOne({
      _id: req.params.noteId,
      assignedTechnician: userId
    })
      .populate('room', 'name description')
      .populate('admin', 'displayName email')
      .lean();
    
    if (!note) {
      return res.status(404).json({ code: 'not_found', message: 'Intervention introuvable' });
    }
    
    // Charger la vérification liée avec tous les items (photos incluses)
    let verificationDetails = null;
    if (note.verification) {
      verificationDetails = await Verification.findById(note.verification)
        .populate('employee', 'displayName email')
        .populate('room', 'name')
        .lean();
    }
    
    res.json({ ...note, verificationDetails });
  } catch (e) {
    console.error('technician:intervention-detail', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════
// PUT /api/technician/interventions/:noteId/status
// Mettre à jour le statut : EN_ATTENTE → EN_COURS → TERMINEE
// ═══════════════════════════════════════════════════════════
router.put('/interventions/:noteId/status', requireAuth, requireTechnician, async (req, res) => {
  try {
    const userId = (req.user?.uid || req.user?.id)?.toString();
    const { status, feedback } = req.body || {};
    
    const validStatuses = ['EN_ATTENTE', 'EN_COURS', 'TERMINEE'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        code: 'bad_request', 
        message: `Statut invalide. Valeurs acceptées : ${validStatuses.join(', ')}` 
      });
    }
    
    const note = await MaintenanceNote.findOne({
      _id: req.params.noteId,
      assignedTechnician: userId
    });
    
    if (!note) {
      return res.status(404).json({ code: 'not_found', message: 'Intervention introuvable' });
    }
    
    // Vérifier la progression logique des statuts
    const statusOrder = { 'EN_ATTENTE': 0, 'EN_COURS': 1, 'TERMINEE': 2 };
    if (statusOrder[status] < statusOrder[note.status]) {
      return res.status(400).json({ 
        code: 'bad_request', 
        message: 'Impossible de revenir à un statut précédent' 
      });
    }
    
    note.status = status;
    if (feedback) note.technicianFeedback = feedback;
    if (status === 'TERMINEE') note.resolvedAt = new Date();
    
    await note.save();
    

    
    res.json(note.toObject());
  } catch (e) {
    console.error('technician:update-status', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

export default router;
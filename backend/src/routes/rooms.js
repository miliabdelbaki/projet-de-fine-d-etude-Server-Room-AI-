import express from 'express';
import Room from '../models/Room.js';
import Checklist from '../models/Checklist.js';
import Verification from '../models/Verification.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// List rooms
router.get('/', requireAuth, async (req, res) => {
  try {
    const rooms = await Room.find().populate('checklist').populate('technicians', 'email displayName role').lean();
    res.json(rooms);
  } catch (e) {
    console.error('rooms:list', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// Get room with history (Any auth user)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('checklist')
      .populate('technicians', 'email displayName role')
      .lean();

    if (!room) return res.status(404).json({ code: 'not_found' });

    // Fetch last 5 verifications
    const history = await Verification.find({ room: room._id })
      .sort({ verifiedAt: -1 })
      .limit(5)
      .populate('technician', 'email displayName')
      .lean();

    res.json({ ...room, history });
  } catch (e) {
    console.error('rooms:get', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// Verify room (Technician)
router.post('/:id/verify', requireAuth, async (req, res) => {
  try {
    const { items = [] } = req.body || {};
    const roomId = req.params.id;

    // 1. Check if room exists and has a checklist
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ code: 'not_found' });
    if (!room.checklist) return res.status(400).json({ code: 'no_checklist', message: 'Aucune checklist assignée à cette salle' });

    // 2. Create Verification record
    const verification = await Verification.create({
      room: roomId,
      checklist: room.checklist,
      technician: req.user.uid,
      items: items.map(i => ({
        label: i.label,
        checked: i.checked,
        photo: i.photo, // Save Base64/URL
        comment: i.comment
      })),
      status: 'completed'
    });

    res.status(201).json(verification);
  } catch (e) {
    console.error('rooms:verify', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// Get full history unique to room (Admin)
router.get('/:id/history', requireAuth, requireAdmin, async (req, res) => {
  try {
    const history = await Verification.find({ room: req.params.id })
      .sort({ verifiedAt: -1 })
      .populate('technician', 'email displayName')
      .populate('checklist', 'name')
      .lean();
    res.json(history);
  } catch (e) {
    console.error('rooms:history', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// Create room (admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, checklist } = req.body || {};
    if (!name) return res.status(400).json({ code: 'bad_request', message: 'Name requis' });
    // optional: verify checklist exists
    if (checklist) {
      const c = await Checklist.findById(checklist);
      if (!c) return res.status(400).json({ code: 'bad_request', message: 'Checklist introuvable' });
    }
    const created = await Room.create({ name, description, checklist });
    res.status(201).json(created);
  } catch (e) {
    console.error('rooms:create', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// Update room (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const updated = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!updated) return res.status(404).json({ code: 'not_found' });
    res.json(updated);
  } catch (e) {
    console.error('rooms:update', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// Delete room (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Room.findByIdAndDelete(req.params.id);
    res.json({ message: 'Supprimé' });
  } catch (e) {
    console.error('rooms:delete', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// Assign or change checklist for a room (admin)
router.put('/:id/checklist', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { checklist } = req.body || {};
    if (!checklist) return res.status(400).json({ code: 'bad_request', message: 'Checklist id requis' });
    const c = await Checklist.findById(checklist);
    if (!c) return res.status(400).json({ code: 'bad_request', message: 'Checklist introuvable' });
    const room = await Room.findByIdAndUpdate(req.params.id, { checklist }, { new: true }).populate('checklist').lean();
    if (!room) return res.status(404).json({ code: 'not_found' });
    res.json(room);
  } catch (e) {
    console.error('rooms:set-checklist', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// Set technicians for a room (admin)
router.put('/:id/technicians', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { technicians = [] } = req.body || {};
    const room = await Room.findByIdAndUpdate(req.params.id, { technicians }, { new: true }).populate('technicians', 'email displayName role').lean();
    if (!room) return res.status(404).json({ code: 'not_found' });
    res.json(room);
  } catch (e) {
    console.error('rooms:set-technicians', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

export default router;

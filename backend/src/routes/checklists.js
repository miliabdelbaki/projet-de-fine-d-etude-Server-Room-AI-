import express from 'express';
import Checklist from '../models/Checklist.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// List all checklists (any authenticated user)
router.get('/', requireAuth, async (req, res) => {
  try {
    const list = await Checklist.find().lean();
    res.json(list);
  } catch (e) {
    console.error('checklists:list', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// Get a single checklist
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const item = await Checklist.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ code: 'not_found' });
    res.json(item);
  } catch (e) {
    console.error('checklists:get', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// Create checklist (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, items = [] } = req.body || {};
    if (!name) return res.status(400).json({ code: 'bad_request', message: 'Name requis' });
    const created = await Checklist.create({ name, description, items, createdBy: req.user.uid });
    res.status(201).json(created);
  } catch (e) {
    console.error('checklists:create', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// Update checklist (admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const update = await Checklist.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!update) return res.status(404).json({ code: 'not_found' });
    res.json(update);
  } catch (e) {
    console.error('checklists:update', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

// Delete checklist (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Checklist.findByIdAndDelete(req.params.id);
    res.json({ message: 'Supprimé' });
  } catch (e) {
    console.error('checklists:delete', e);
    res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

export default router;

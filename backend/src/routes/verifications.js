import express from "express";
import Verification from "../models/Verification.js";
import Room from "../models/Room.js";
import Checklist from "../models/Checklist.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// ================= LIST VERIFICATIONS =================
// GET /api/verifications/
router.get("/", requireAuth, async (req, res) => {
  try {
    const list = await Verification.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("technician", "email displayName")
      .populate("validatedBy", "email displayName")
      .populate("checklist")
      .lean();
    res.json(list);
  } catch (e) {
    console.error("verification:list", e);
    res.status(500).json({ code: "server_error", message: "Erreur serveur" });
  }
});

// ================= HISTORY =================
// GET /api/verifications/history
router.get("/history", requireAuth, async (req, res) => {
  try {
    const userId = (req.user?.uid || req.user?.id || req.user?._id)?.toString();

    const verifications = await Verification.find({ technician: userId })
      .sort({ createdAt: -1 })
      .populate("room", "name description")
      .populate("checklist", "name")
      .lean();

    res.json({ items: verifications });
  } catch (e) {
    console.error("verification:history", e);
    res.status(500).json({ code: "server_error", message: "Erreur serveur" });
  }
});

// ================= START VERIFICATION =================
// POST /api/verifications/rooms/:roomId/start-verification
router.post("/rooms/:roomId/start-verification", requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = (req.user?.uid || req.user?.id || req.user?._id)?.toString();

    console.log(">>> userId:", userId, "roomId:", roomId);

    if (!userId) {
      return res.status(401).json({ code: "unauthorized", message: "Utilisateur non authentifié" });
    }

    const room = await Room.findById(roomId).populate("checklist");

    if (!room) {
      return res.status(404).json({ code: "not_found", message: "Salle introuvable" });
    }

    if (!room.checklist) {
      return res.status(400).json({ code: "bad_request", message: "Aucune checklist assignée à cette salle" });
    }

    let checklistItems = Array.isArray(room.checklist.items) ? room.checklist.items : [];

    if (checklistItems.length === 0) {
      const fresh = await Checklist.findById(room.checklist._id).lean();
      checklistItems = Array.isArray(fresh?.items) ? fresh.items : [];
    }

    console.log(">>> CHECKLIST ITEMS:", checklistItems.length);

    if (checklistItems.length === 0) {
      return res.status(400).json({ code: "empty_checklist", message: "La checklist ne contient aucun item" });
    }

    const isAssigned = room.technicians?.some(tech => tech.toString() === userId);
    if (!isAssigned) {
      room.technicians = room.technicians || [];
      room.technicians.push(userId);
      await room.save();
    }

    const verificationItems = checklistItems.map((item, index) => ({
      itemId: item._id,
      label: item.label,
      required: item.required ?? false,
      order: item.order ?? index,
      completed: false,
      photo: null,
      notes: "",
    }));

    const verification = await Verification.create({
      room: roomId,
      checklist: room.checklist._id,
      technician: userId,
      items: verificationItems,
      status: "draft"
    });

    const result = verification.toObject();
    console.log(">>> VERIFICATION CRÉÉE - items:", result.items?.length);

    res.status(201).json(result);

  } catch (e) {
    console.error("verification:start ERROR:", e.message);
    res.status(500).json({ code: "server_error", message: e.message });
  }
});

// ================= ROOM VERIFICATIONS =================
// GET /api/verifications/rooms/:roomId/verifications
router.get("/rooms/:roomId/verifications", requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const verifications = await Verification.find({ room: roomId })
      .populate("technician", "email displayName")
      .populate("validatedBy", "email displayName")
      .populate("checklist")
      .sort({ createdAt: -1 })
      .lean();
    res.json(verifications);
  } catch (e) {
    console.error("verification:list-room", e);
    res.status(500).json({ code: "server_error", message: "Erreur serveur" });
  }
});

// ================= UPDATE ITEM =================
// PUT /api/verifications/:verificationId/items/:itemIndex
router.put("/:verificationId/items/:itemIndex", requireAuth, async (req, res) => {
  try {
    const { verificationId, itemIndex } = req.params;
    const { completed, photo, notes, comment } = req.body || {};
    const userId = (req.user?.uid || req.user?.id || req.user?._id)?.toString();

    console.log(`>>> UPDATE ITEM [${itemIndex}] — verif: ${verificationId} — user: ${userId}`);
    console.log(`>>> UPDATE ITEM — completed: ${completed}, hasPhoto: ${!!photo}, photoLen: ${photo?.length || 0}`);

    const verification = await Verification.findById(verificationId);

    if (!verification) {
      console.log(">>> UPDATE ITEM: vérification introuvable");
      return res.status(404).json({ code: "not_found" });
    }

    if (verification.technician.toString() !== userId) {
      console.log(">>> UPDATE ITEM: accès interdit");
      return res.status(403).json({ code: "forbidden" });
    }

    if (verification.status !== "draft") {
      return res.status(400).json({ code: "bad_request", message: "Vérification déjà soumise" });
    }

    const idx = Number(itemIndex);
    const item = verification.items[idx];
    if (!item) {
      console.log(`>>> UPDATE ITEM: item ${idx} introuvable (total: ${verification.items.length})`);
      return res.status(404).json({ code: "not_found", message: "Item introuvable" });
    }

    item.completed = completed ?? false;

    if (photo !== undefined && photo !== null) {
      // Normalisation: stocker uniquement le base64 brut (sans préfixe data:URL)
      const cleanPhoto = photo.replace(/^data:[^;]+;base64,/, '');
      item.photo = cleanPhoto;
      console.log(`>>> UPDATE ITEM: photo sauvegardée — ${cleanPhoto.length} chars`);
    }

    if (notes !== undefined) item.notes = notes;
    if (comment !== undefined) item.comment = comment;
    if (item.completed) item.completedAt = new Date();

    // ✅ CRITICAL FIX: forcer Mongoose à détecter les changements du sous-document
    verification.markModified('items');

    await verification.save();
    console.log(`>>> UPDATE ITEM: sauvegardé avec succès`);

    res.json(verification.toObject());

  } catch (e) {
    console.error("verification:update-item ERROR:", e.message);
    res.status(500).json({ code: "server_error", message: e.message });
  }
});

// ================= SUBMIT VERIFICATION =================
// PUT /api/verifications/:verificationId/submit
router.put("/:verificationId/submit", requireAuth, async (req, res) => {
  try {
    const { verificationId } = req.params;
    const { notes } = req.body || {};
    const userId = (req.user?.uid || req.user?.id || req.user?._id)?.toString();

    const verification = await Verification.findById(verificationId);

    if (!verification) {
      return res.status(404).json({ code: "not_found" });
    }

    if (verification.technician.toString() !== userId) {
      return res.status(403).json({ code: "forbidden" });
    }

    verification.status = "submitted";
    verification.submittedAt = new Date();
    if (notes) verification.notes = notes;

    await verification.save();
    res.json(verification.toObject());

  } catch (e) {
    console.error("verification:submit", e);
    res.status(500).json({ code: "server_error", message: "Erreur serveur" });
  }
});

// ================= VALIDATE VERIFICATION =================
// PUT /api/verifications/:verificationId/validate
router.put("/:verificationId/validate", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { verificationId } = req.params;
    const adminId = (req.user?.uid || req.user?.id || req.user?._id)?.toString();

    const verification = await Verification.findById(verificationId);

    if (!verification) {
      return res.status(404).json({ code: "not_found" });
    }

    if (verification.status !== "submitted") {
      return res.status(400).json({ code: "bad_request", message: "Vérification non soumise" });
    }

    verification.status = "validated";
    verification.validatedBy = adminId;
    verification.validatedAt = new Date();

    await verification.save();
    res.json(verification.toObject());

  } catch (e) {
    console.error("verification:validate", e);
    res.status(500).json({ code: "server_error", message: "Erreur serveur" });
  }
});

export default router;
import 'dotenv/config';
import express from 'express';
import Verification from '../models/Verification.js';
import Room from '../models/Room.js';
import MaintenanceNote from '../models/MaintenanceNote.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// =========================
// API Keys — lire depuis les variables d'environnement UNIQUEMENT
// Ne jamais hardcoder une clé dans le code source !
// Dans votre .env : OPENROUTER_API_KEY=sk-or-v1-...
// =========================
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const GROQ_API_KEY       = process.env.GROQ_API_KEY || '';
const OPENROUTER_MODEL   = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct';
const GROQ_MODEL         = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

if (!OPENROUTER_API_KEY) {
  console.warn('[AI] ⚠️  OPENROUTER_API_KEY non définie dans .env — OpenRouter désactivé.');
}

// =========================
// Analyse de texte par liste de mots-cles : SUPPRIMEE volontairement.
// Le risque doit etre calcule par l IA (via votre cle API), en analysant le commentaire du technicien.

// =========================
// Extraire tous les commentaires
// =========================
function extractAllComments(verifications) {
  const items = [];
  for (const v of (verifications || [])) {
    const date    = new Date(v.createdAt || v.submittedAt).toISOString().split('T')[0];
    const topNote = (v.notes || v.comment || '').trim();
    if (topNote) items.push({ date, label: 'Note globale', text: topNote });
    for (const item of (v.items || [])) {
      const note = (item.notes || item.comment || '').trim();
      if (note) items.push({ date, label: item.label || 'Item', text: note, completed: item.completed });
      // Important: ne pas injecter de phrases generees par le code dans l'analyse IA.
      // Seuls les commentaires saisis par le technicien sont analyses.
    }
  }
  return items;
}

// =========================
// Calcul etat final a partir du score numerique
// REGLE : risk < 20 -> Normal | 20-29 -> Normal ou Attention selon semantique
//         30-49 -> Attention | >= 50 -> Anormal
// =========================
function deriveState(risk, hasSemanticAnomaly) {
  if (risk >= 50) return 'Anormal';
  if (risk >= 30)  return 'Attention';
  if (risk >= 20 && hasSemanticAnomaly) return 'Attention';
  return 'Normal';
}

// =========================
// Post-validation IA : corrige l etat si l IA ne respecte pas les seuils
// =========================
function enforceStateFromRisk(risk, aiState) {
  if (risk < 20) return 'Normal';
  if (risk < 30 && aiState === 'Anormal') return 'Attention';
  if (risk >= 50) return 'Anormal';
  return aiState || 'Normal';
}

// =========================
// Heuristique minimale si l'IA est indisponible (données DB quand même interprétables)
// =========================
function commentLooksConcerning(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /\b(mauvais|defaut|panne|probleme|erreur|anomal|alarme|critique|non\s+conforme|urgent|fuite|surchauffe)\b/i.test(t)
    || /\bne\s+(fonctionne|marche)\s+pas\b/i.test(t)
    || /\bmauvais(e|es)?\s+\w+/i.test(t);
}

// =========================
// Analyse locale
// =========================
function localRiskFromVerifications(verifications) {
  const allItems = extractAllComments(verifications);

  if (!allItems.length) {
    return { risk: 5, state: 'Normal', reason: 'Aucun commentaire de verification', issues: 0, total: 0, issueItems: [] };
  }

  // Fallback : incomplet + commentaires DB "préoccupants" (sans liste dupliquée du frontend).
  const issueItems      = allItems.filter(c => c.completed === false || commentLooksConcerning(c.text));
  const concerningItems = allItems.filter(c => commentLooksConcerning(c.text));
  const ratio           = issueItems.length / allItems.length;
  const baseRisk        = Math.min(95, Math.round(ratio * 100));

  const statusPoints = (verifications || []).reduce((sum, v) => {
    if (v.status === 'incomplete') return sum + 20;
    if (v.status === 'draft')      return sum + 10;
    if (v.status === 'submitted')  return sum + 5;
    return sum;
  }, 0);
  const statusAvg = verifications.length ? Math.round(statusPoints / verifications.length) : 0;

  const totalItems        = (verifications || []).reduce((s, v) => s + (v.items || []).length, 0);
  const incomplete        = (verifications || []).reduce((s, v) => s + (v.items || []).filter(i => !i.completed).length, 0);
  const incompletePenalty = totalItems > 0 ? Math.round((incomplete / totalItems) * 30) : 0;

  const risk = Math.min(100, Math.max(5, baseRisk + statusAvg / 2 + incompletePenalty));

  const hasSemanticAnomaly = concerningItems.length > 0;
  const state              = deriveState(risk, hasSemanticAnomaly);

  return {
    risk,
    issues:     issueItems.length,
    total:      allItems.length,
    issueItems: issueItems.slice(0, 5).map(i => `${i.label}: ${i.text}`),
    state,
    reason: issueItems.length > 0
      ? `Fallback local: ${issueItems.length}/${allItems.length} points a surveiller (commentaires DB)`
      : 'Analyse locale — aucun signal fort dans les commentaires.',
  };
}

// =========================
// Prediction tendance
// =========================
function predictRiskTrend(verifications) {
  const sorted = [...(verifications || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const win    = sorted.slice(-6);
  if (win.length < 2) return { predictedRisk: null, trend: 'stable' };

  const values  = win.map(v => localRiskFromVerifications([v]).risk);
  const avgLast = values.slice(-3).reduce((s, n) => s + n, 0) / Math.max(1, 3);
  const avgPrev = values.slice(0, -3).reduce((s, n) => s + n, 0) / Math.max(1, values.length - 3);
  const delta   = avgLast - avgPrev;

  return {
    predictedRisk: Math.min(100, Math.max(0, Math.round(avgLast + delta))),
    trend: delta > 8 ? 'hausse' : delta < -8 ? 'baisse' : 'stable',
  };
}

// =========================
// Decision maintenance — basee sur le score numerique reel
// =========================
function maintenanceDecision(risk, state) {
  if (risk >= 80)
    return { priority: 'Critique', action: 'Intervention immediate requise',  details: 'Anomalies critiques detectees, arret et inspection en urgence.' };
  if (risk >= 50 || state === 'Anormal')
    return { priority: 'Haute',    action: 'Inspection urgente',              details: 'Risque eleve, planifier une inspection dans les 48h.' };
  if (risk >= 30 || state === 'Attention')
    return { priority: 'Moyenne',  action: 'Surveillance renforcee',          details: 'Augmenter la frequence des verifications.' };
  return   { priority: 'Faible',   action: 'Maintenance routine',             details: 'Aucune action immediate requise.' };
}

// =========================
// IA — OpenRouter (primaire)
// =========================
async function analyzeWithOpenRouter(verifications, roomContext) {
  if (!OPENROUTER_API_KEY) return null;

  const allItems = extractAllComments(verifications);
  if (!allItems.length) return null;

  const commentLines = allItems
    .filter(it => it.text && it.text.trim())
    .map(it => `[${it.date}] "${it.text}"`)
    .join('\n');

  if (!commentLines) return null;

  const salleNom = roomContext?.name ? String(roomContext.name) : 'Salle (nom inconnu)';
  const salleDesc = roomContext?.description ? String(roomContext.description) : '';
  const roomBlock = salleDesc ? `${salleNom}\nDescription: ${salleDesc}` : salleNom;

  const prompt = `Tu es un expert en maintenance de salles serveurs.
Contexte de la salle (utiliser comme contexte UNIQUEMENT, pas comme commentaire technicien) :
${roomBlock}

Analyse les commentaires ci-dessous.

REGLES OBLIGATOIRES :
1. Le score "risk" (0-100) doit refleter la gravite reelle des commentaires.
2. Seuils d etat : risk < 30 -> "Normal" | 30-49 -> "Attention" | >= 50 -> "Anormal".
   Un score de 17% doit donner l etat "Normal", PAS "Anormal".
3. Analyse UNIQUEMENT les commentaires du technicien fournis ci-dessous.
   Ne traite pas la description de la salle comme un commentaire technicien.
   N analyse pas les libelles techniques, ni les phrases systeme, ni les regles de code.
4. Analyse le SENS de chaque commentaire. Un commentaire exprimant un mauvais etat,
   une plainte, un defaut ou une anomalie compte comme problematique meme sans mot-cle exact.
5. Retourne UNIQUEMENT un OBJET JSON valide (pas un tableau) (sans markdown, sans backticks).

Commentaires :
${commentLines}

Format : {"state":"Normal"|"Attention"|"Anormal","risk":<0-100>,"issues":<nb>,"total":<nb>,"reason":"<texte>","alerts":["<a1>","<a2>"]}`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://serverroom-app.local',
      'X-Title': 'ServerRoom Risk Analysis',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);

  const data   = await res.json();
  const raw    = data.choices?.[0]?.message?.content || '';

  // Nettoyage robuste du JSON (objet ou tableau)
  let cleanJson = raw.replace(/```json|```/g, '').trim();
  const jsonMatch = cleanJson.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) cleanJson = jsonMatch[0];

  let parsed;
  try {
    parsed = JSON.parse(cleanJson);
    if (Array.isArray(parsed)) parsed = parsed[0] || null;
  } catch (parseErr) {
    console.warn('[AI] OpenRouter JSON parse error:', parseErr.message, 'Raw:', raw.slice(0, 200));
    return null;
  }

  return { ...parsed, predictedRisk: Math.min(100, (parsed.risk || 0) + 8), provider: 'openrouter' };
}

// =========================
// IA — Groq (fallback)
// =========================
async function analyzeWithGroq(verifications, roomContext) {
  if (!GROQ_API_KEY) return null;

  const allItems = extractAllComments(verifications);
  if (!allItems.length) return null;

  const commentLines = allItems
    .filter(it => it.text && it.text.trim())
    .map(it => `[${it.date}] "${it.text}"`)
    .join('\n');

  if (!commentLines) return null;

  const salleNom = roomContext?.name ? String(roomContext.name) : 'Salle (nom inconnu)';
  const salleDesc = roomContext?.description ? String(roomContext.description) : '';
  const roomBlock = salleDesc ? `${salleNom}\nDescription: ${salleDesc}` : salleNom;

  const prompt = `Tu es un expert en maintenance de salles serveurs.
Contexte de la salle (utiliser comme contexte UNIQUEMENT, pas comme commentaire technicien) :
${roomBlock}

Analyse ces commentaires.

REGLES : risk < 30 -> "Normal" | 30-49 -> "Attention" | >= 50 -> "Anormal".
Analyse UNIQUEMENT les commentaires du technicien, pas la description de la salle.
Ne traite pas la description de la salle comme un commentaire technicien.
Analyse le sens reel (17% = Normal). Retourne UNIQUEMENT un OBJET JSON (pas un tableau), sans markdown.

Commentaires :
${commentLines}

Format : {"state":"Normal"|"Attention"|"Anormal","risk":<0-100>,"issues":<nb>,"total":<nb>,"reason":"<texte>","alerts":["<a1>"]}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 512,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);

  const data   = await res.json();
  const raw    = data.choices?.[0]?.message?.content || '';

  // Nettoyage robuste du JSON (objet ou tableau)
  let cleanJson = raw.replace(/```json|```/g, '').trim();
  const jsonMatch = cleanJson.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) cleanJson = jsonMatch[0];

  let parsed;
  try {
    parsed = JSON.parse(cleanJson);
    if (Array.isArray(parsed)) parsed = parsed[0] || null;
  } catch (parseErr) {
    console.warn('[AI] Groq JSON parse error:', parseErr.message, 'Raw:', raw.slice(0, 200));
    return null;
  }

  return { ...parsed, predictedRisk: Math.min(100, (parsed.risk || 0) + 8), provider: 'groq' };
}

// =========================
// Orchestrateur IA : OpenRouter -> Groq -> local
// Post-validation du state retourne par l IA
// =========================
async function analyzeWithAI(verifications, roomContext) {
  try {
    const r = await analyzeWithOpenRouter(verifications, roomContext);
    if (r && r.risk !== undefined) {
      r.state = enforceStateFromRisk(r.risk, r.state);
      return r;
    }
  } catch (e) { console.warn('[AI] OpenRouter failed:', e.message); }

  try {
    const r = await analyzeWithGroq(verifications, roomContext);
    if (r && r.risk !== undefined) {
      r.state = enforceStateFromRisk(r.risk, r.state);
      return r;
    }
  } catch (e) { console.warn('[AI] Groq failed:', e.message); }

  return null;
}

// =========================
// ROUTE : Analyse principale
// =========================
router.post('/room-risk', requireAuth, async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ message: 'roomId requis' });

    const room = await Room.findById(roomId).lean();
    const verifications = await Verification.find({ room: roomId })
      .sort({ createdAt: -1 }).limit(20).lean();

    const local = localRiskFromVerifications(verifications);
    const trend = predictRiskTrend(verifications);
    const ai    = await analyzeWithAI(verifications, room);

    if (ai && ai.risk != null) {
      return res.json({
        state:         ai.state,
        risk:          ai.risk,
        predictedRisk: ai.predictedRisk ?? trend.predictedRisk,
        issues:        ai.issues  ?? local.issues,
        total:         ai.total   ?? local.total,
        issueItems:    ai.alerts  || local.issueItems,
        reason:        ai.reason,
        alerts:        ai.alerts  || [],
        trend:         trend.trend,
        maintenance:   maintenanceDecision(ai.risk, ai.state),
        note:          ai.provider === 'openrouter'
                         ? 'Analyse IA via OpenRouter'
                         : 'Analyse IA via Groq',
        source:        ai.provider,
      });
    }

    return res.json({
      ...local,
      ...trend,
      alerts:      local.issueItems,
      maintenance: maintenanceDecision(local.risk, local.state),
      note:        'Mode local (fallback)',
      source:      'local',
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// ROUTE : Prediction + decision
// =========================
router.post('/room-risk-predict', requireAuth, async (req, res) => {
  try {
    const { roomId } = req.body;
    const verifications = await Verification.find({ room: roomId }).lean();
    const analysis = localRiskFromVerifications(verifications);
    const trend    = predictRiskTrend(verifications);
    const decision = maintenanceDecision(analysis.risk, analysis.state);
    res.json({ ...analysis, ...trend, maintenance: decision });
  } catch (e) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// ROUTE : Maintenance uniquement
// =========================
router.post('/room-maintenance', requireAuth, async (req, res) => {
  try {
    const { roomId } = req.body;
    const verifications = await Verification.find({ room: roomId }).lean();
    const analysis = localRiskFromVerifications(verifications);
    res.json({ decision: maintenanceDecision(analysis.risk, analysis.state) });
  } catch (e) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// =========================
// ROUTE : Enregistrer une decision admin
// =========================
function normalizeMaintenancePriority(p) {
  const allowed = ['Faible', 'Moyenne', 'Haute', 'Critique'];
  if (!p || typeof p !== 'string') return 'Moyenne';
  const t = p.trim();
  const lower = t.toLowerCase();
  const map = {
    faible: 'Faible', moyenne: 'Moyenne', moyen: 'Moyenne', haute: 'Haute', critique: 'Critique',
  };
  const v = map[lower] || (allowed.includes(t) ? t : null);
  return v || 'Moyenne';
}

router.post('/maintenance-note', requireAuth, async (req, res) => {
  try {
    const { roomId, verificationId, note, priority, aiState, aiRisk } = req.body;
    if (!roomId || !note) return res.status(400).json({ message: 'roomId et note requis' });

    const adminId = (req.user.uid || req.user._id || req.user.id)?.toString();
    if (!adminId) return res.status(401).json({ message: 'Utilisateur non identifié' });

    const pri = normalizeMaintenancePriority(priority);
    const riskNum = typeof aiRisk === 'number' ? aiRisk : aiRisk != null ? Number(aiRisk) : null;
    const riskFinal = Number.isFinite(riskNum) ? riskNum : null;

    if (verificationId) {
      const verif = await Verification.findById(verificationId).lean();
      if (!verif) return res.status(404).json({ message: 'Vérification introuvable' });
      if (String(verif.room) !== String(roomId)) {
        return res.status(400).json({ message: 'Cette vérification n appartient pas à cette salle' });
      }

      const doc = await MaintenanceNote.findOneAndUpdate(
        { verification: verificationId },
        {
          $set: {
            room: roomId,
            admin: adminId,
            note: note.trim(),
            priority: pri,
            aiState: aiState || null,
            aiRisk: riskFinal,
            verification: verificationId,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
      await doc.populate('admin', 'displayName email');
      return res.status(201).json(doc);
    }

    const doc = await MaintenanceNote.create({
      room: roomId,
      admin: adminId,
      note: note.trim(),
      priority: pri,
      aiState: aiState || null,
      aiRisk: riskFinal,
    });
    await doc.populate('admin', 'displayName email');
    res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur enregistrement' });
  }
});

// =========================
// ROUTE : Recuperer les decisions admin
// =========================
router.get('/maintenance-notes/:roomId', requireAuth, async (req, res) => {
  try {
    const notes = await MaintenanceNote.find({ room: req.params.roomId })
      .populate('admin', 'displayName email')
      .populate('verification', 'status submittedAt createdAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json(notes);
  } catch (e) {
    res.status(500).json({ message: 'Erreur recuperation' });
  }
});

export default router;
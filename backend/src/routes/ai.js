import express from 'express';
import Verification from '../models/Verification.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Analyse de risque via OpenAI (chatGPT)
router.post('/room-risk', requireAuth, async (req, res) => {
  try {
    const { roomId } = req.body || {};
    if (!roomId) return res.status(400).json({ code: 'bad_request', message: 'roomId requis' });

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) {
      return res.status(501).json({ code: 'missing_api_key', message: 'OPENAI_API_KEY non configurée' });
    }

    const verifications = await Verification.find({ room: roomId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('technician', 'email displayName')
      .lean();

    const comments = verifications
      .map((v) => {
        const date = new Date(v.submittedAt || v.createdAt).toISOString().split('T')[0];
        const tech = v.technician?.displayName || v.technician?.email || 'Technicien inconnu';
        const note = v.notes || v.comment || '';
        return `- [${date}] (${tech}) statut=${v.status} commentaire="${note}"`;
      })
      .join('\n');

    const prompt = `Tu es un expert en maintenance de salles serveurs. En te basant sur l'historique des vérifications ci-dessous (statut + commentaires), indique :\n1) L'état global de la salle (Normal ou Anormal)\n2) Un score de risque 0-100\n3) Une explication brève\n\nRéponds strictement au format JSON : {"state":"Normal|Anormal","risk":<nombre> ,"reason":"..."}.\n\nHistorique :\n${comments}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Tu es un assistant expert en maintenance de salles serveurs.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 250,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI error', error);
      return res.status(502).json({ code: 'openai_error', message: 'Erreur OpenAI', details: error });
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // Si la réponse n'est pas un JSON valide, renvoyer le texte brut
      return res.json({ raw: text });
    }

    return res.json(parsed);
  } catch (e) {
    console.error('ai:room-risk', e);
    return res.status(500).json({ code: 'server_error', message: 'Erreur serveur' });
  }
});

export default router;

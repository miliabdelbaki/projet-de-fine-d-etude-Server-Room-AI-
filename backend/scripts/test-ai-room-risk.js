import 'dotenv/config';

async function postGroq(prompt, apiKey, model) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(15000),
  });

  const text = await res.text();
  if (!res.ok) return { ok: false, status: res.status, body: text };

  try {
    const payload = JSON.parse(text);
    const raw = payload?.choices?.[0]?.message?.content || '';
    // Nettoyage robuste (bloc ```json possible + texte autour)
    let clean = raw.replace(/```json|```/g, '').trim();
    const m = clean.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!m) return { ok: false, status: res.status, body: raw.slice(0, 500) };
    let parsed = JSON.parse(m[0]);
    if (Array.isArray(parsed)) parsed = parsed[0] || null;
    return { ok: true, json: parsed };
  } catch (e) {
    // Fall back: return raw payload for debugging
    return { ok: false, status: res.status, body: text.slice(0, 800), parseError: e?.message };
  }
}

async function main() {
  const groqKey = process.env.GROQ_API_KEY || '';
  const groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

  if (!groqKey) {
    console.log(JSON.stringify({ ok: false, error: 'Missing GROQ_API_KEY' }, null, 2));
    process.exit(1);
  }

  const roomContext = {
    name: 'Salle Serveur A',
    description: 'Salle technique avec baie serveurs. Objectif: éviter surchauffe et coupures.',
  };

  const commentLines = [
    '[2026-03-23] "Surchauffe ressentie, ventilation bruyante."',
    '[2026-03-22] "RAS, tout fonctionne normalement."',
  ].join('\n');

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
Analyse le sens reel (17% = Normal). JSON uniquement, sans markdown.

Commentaires :
${commentLines}

Format : {"state":"Normal"|"Attention"|"Anormal","risk":<0-100>,"issues":<nb>,"total":<nb>,"reason":"<texte>","alerts":["<a1>"]}`;

  const out = await postGroq(prompt, groqKey, groqModel);
  console.log(JSON.stringify(out, null, 2));
  process.exitCode = out.ok ? 0 : 1;
  return;
}

main().catch((e) => {
  console.error('Test failed:', e?.message || e);
  process.exitCode = 1;
});


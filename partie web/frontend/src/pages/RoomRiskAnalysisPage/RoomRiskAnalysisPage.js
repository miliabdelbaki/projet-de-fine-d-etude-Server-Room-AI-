import './RoomRiskAnalysisPage.css';
import React, { useState, useEffect } from 'react';
import {
  Box, Select, MenuItem, FormControl, InputLabel, CircularProgress,
  Grid, List, ListItem, ListItemText, Typography, Paper, Chip,
  TextField, Button
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { roomsAPI, verificationsAPI, usersAPI, API_BASE } from '../../services/api';


/* helpers */
const KEYWORDS_ISSUE = [
  'mauvais',
  'panne', 'défaillance', 'défaut', 'erreur', 'incident', 'anormal', 'problème',
  'non conforme', 'vide', 'bloqué', 'fuite', 'chauffe', 'bruit', 'alarme',
  'cassé', 'hors service', 'dégradé', 'dysfonctionnement',
  'température élevée', 'surchauffe', 'chaud', 'trop chaud', 'chaleur',
  'température anormale', 'temp élevée', 'temp critique',
  'humidité élevée', 'humidité anormale', 'trop humide', 'condensation', 'eau', 'infiltration',
  'climatisation', 'ventilation', 'clim', 'refroidissement', 'ventilateur', 'fan',
  'tension', 'voltage', 'onduleur', 'ups', 'court-circuit', 'surcharge', 'surtension',
  'accès non autorisé', 'intrusion', 'badge', 'serrure',
  'avertissement', 'urgent', 'critique', 'risque', 'danger', 'attention',
];

// Patterns sémantiques négatifs — détecte défaut/plainte/mauvais état sans mot-clé exact
const NEGATIVE_PATTERNS = [
  /ne fonctionne pas/i, /ne marche pas/i,
  /n.est pas (ok|correct|conforme|bon|normal|opérationnel)/i,
  /toujours (le .{0,10}|un )?(problème|défaut|souci)/i,
  /encore (le |un )?(problème|défaut|incident)/i,
  /doit être (réparé|changé|remplacé|vérifié|inspecté)/i,
  /besoin (d.une?|de) (réparation|intervention|maintenance|vérification)/i,
  /constaté.{0,40}(défaut|anomalie|problème)/i,
  /mauvais\s*(état|fonctionnement|résultat)/i,
  // "mauvais température", "mauvais humidité", fautes d'orthographe côté terrain
  /mauvais(e|es)?\s+\w+/i,
  /anomalie|irrégularité|non.conformité/i,
  /plainte|réclamation|inquiétant|préoccupant/i,
  /à (réparer|changer|remplacer|vérifier|inspecter)/i,
  /niveau.{0,20}(élevé|critique|anormal|trop (haut|bas))/i,
  /trop (fort|faible|chaud|froid|humide|sec|bruyant)/i,
  /hors (norme|service|tolérance)/i,
  /arrêt|coupure|interruption/i,
  /détérioré|endommagé|usé|oxydé/i,
  /bruit (anormal|fort|inhabituel|suspect)/i,
];

function isSemanticIssue(text) {
  if (!text) return false;
  const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return NEGATIVE_PATTERNS.some(p => p.test(t));
}

function hasIssue(t = '') {
  const lower = t.toLowerCase();
  const norm = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return KEYWORDS_ISSUE.some(kw => lower.includes(kw) || norm.includes(kw)) || isSemanticIssue(t);
}

function extractComments(verifications = []) {
  const result = [];
  for (const v of verifications) {
    const date = new Date(v.submittedAt || v.createdAt).toLocaleDateString('fr-FR');
    const tech = v.technician?.displayName || v.technician?.email || 'Inconnu';
    const topNote = (v.notes || v.comment || '').trim();
    if (topNote) result.push({ date, tech, label: 'Note globale', text: topNote, completed: true, verif: v });
    for (const item of (v.items || [])) {
      const note = (item.notes || item.comment || '').trim();
      if (note) result.push({ date, tech, label: item.label || 'Item', text: note, completed: item.completed ?? true, verif: v });
    }
  }
  return result;
}

// Calcul état : basé sur le score numérique réel (pas sur la présence de mots-clés)
// risk < 30 → Normal | 30-49 → Attention | >= 50 → Anormal
function deriveStateFromRisk(risk, hasSemanticAnomaly) {
  if (risk >= 50) return 'Anormal';
  if (risk >= 30) return 'Attention';
  if (risk >= 20 && hasSemanticAnomaly) return 'Attention';
  return 'Normal';
}

function calcLocalRisk(verifications = []) {
  const comments = extractComments(verifications);
  if (!comments.length) return {
    risk: 5, predictedRisk: 5, state: 'Normal',
    reason: 'Aucun commentaire disponible.', alerts: [], issues: 0, total: 0,
    maintenance: { priority: 'Faible', action: 'Maintenance routine', details: 'Aucune donnée.' },
  };

  const issueList = comments.filter(c => hasIssue(c.text) || !c.completed);
  const risk = Math.min(100, Math.round((issueList.length / comments.length) * 100));

  const hasSemanticAnomaly = issueList.some(c => isSemanticIssue(c.text));
  const state = deriveStateFromRisk(risk, hasSemanticAnomaly);

  // Maintenance basée sur le score, pas l'état seul
  const maintenance =
    risk >= 80 ? { priority: 'Critique', action: 'Intervention immédiate', details: 'Anomalies critiques.' }
      : risk >= 50 || state === 'Anormal' ? { priority: 'Haute', action: 'Inspection urgente', details: 'Planifier inspection 48h.' }
        : risk >= 30 || state === 'Attention' ? { priority: 'Moyenne', action: 'Surveillance renforcée', details: 'Augmenter fréquence.' }
          : { priority: 'Faible', action: 'Maintenance routine', details: 'Aucune action immédiate.' };

  return {
    risk, issues: issueList.length, total: comments.length,
    predictedRisk: Math.min(100, risk + (risk > 50 ? 10 : 5)),
    state,
    reason: issueList.length > 0
      ? `${issueList.length}/${comments.length} commentaires préoccupants`
      : 'Aucun problème détecté.',
    alerts: issueList.slice(0, 3).map(i => `${i.label}: ${i.text}`),
    maintenance,
  };
}



const PRIORITY_COLOR = { Critique: '#ef5350', Haute: '#ffab00', Moyenne: '#4a90e2', Faible: '#00e676' };

function RiskGauge({ value, label, color }) {
  const r = 58, circ = Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, value)) / 100) * circ;
  return (
    <div className="rra-gauge-wrap">
      <svg className="rra-gauge-svg" width={150} height={95} viewBox="-10 -10 175 105">
        <path d={`M 0 80 A ${r} ${r} 0 0 1 ${r * 2} 80`} fill="none" stroke="#161c26" strokeWidth="13" />
        <path d={`M 0 80 A ${r} ${r} 0 0 1 ${r * 2} 80`} fill="none" stroke={color} strokeWidth="13"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="butt"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)' }} />
        <text x="80" y="76" textAnchor="middle"
          style={{ fontFamily: 'Barlow Condensed,sans-serif', fontWeight: 800, fontSize: 30, fill: color }}>
          {value}%
        </text>
      </svg>
      <Typography sx={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: '#3a4a5a', textTransform: 'uppercase', letterSpacing: '.06em', mt: -1 }}>
        {label}
      </Typography>
    </div>
  );
}

export default function RoomRiskAnalysisPage() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [verifications, setVerifications] = useState([]);
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [notePriority, setNotePriority] = useState('Moyenne');
  const [saving, setSaving] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [assignedTechnicianId, setAssignedTechnicianId] = useState('');
  const [selectedComment, setSelectedComment] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  useEffect(() => { loadRooms(); }, []);
  useEffect(() => {
    if (isAdmin) loadTechnicians();
  }, [isAdmin]);
  useEffect(() => {
    if (selectedRoomId) {
      loadVerifications(selectedRoomId);
      loadAiAnalysis(selectedRoomId);
    }
  }, [selectedRoomId]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const data = await roomsAPI.getAll();
      setRooms(data);
      if (data.length > 0) setSelectedRoomId(data[0]._id || data[0].id);
    } catch { enqueueSnackbar('Erreur chargement salles', { variant: 'error' }); }
    finally { setLoading(false); }
  };

  const loadVerifications = async (roomId) => {
    try {
      const data = await verificationsAPI.getByRoom(roomId);
      setVerifications(data);
    } catch { setVerifications([]); }
  };

  const loadTechnicians = async () => {
    try {
      const users = await usersAPI.getAll();
      const techs = users.filter(u => u.role === 'technicien');
      setTechnicians(techs);
      if (techs.length > 0) setAssignedTechnicianId(prev => prev || techs[0].id);
    } catch {
      setTechnicians([]);
    }
  };

  const getPhotoSrc = (photo) => {
    if (!photo || photo.length === 0) return null;
    if (photo.startsWith('data:')) return photo;
    return `data:image/jpeg;base64,${photo}`;
  };

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };


  const loadAiAnalysis = async (roomId) => {
    setAiLoading(true); setAiResult(null);
    try {
      const res = await fetch(`${API_BASE}/ai/room-risk`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ roomId }) });
      if (res.ok) setAiResult(await res.json());
      else {
        const errText = await res.text().catch(() => '');
        console.warn('[room-risk]', res.status, errText);
        enqueueSnackbar(`Analyse IA indisponible (${res.status}) — affichage local`, { variant: 'warning' });
      }
    } catch (e) { console.error('AI error', e); enqueueSnackbar('Erreur réseau analyse IA', { variant: 'error' }); }
    finally { setAiLoading(false); }
  };

  const saveNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/ai/maintenance-note`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          roomId: selectedRoomId,
          note: noteText,
          priority: notePriority,
          aiState: result.state,
          aiRisk: result.risk,
          assignedTechnicianId: assignedTechnicianId || null
        })
      });
      if (res.ok) {
        enqueueSnackbar('Décision enregistrée (niveau salle). Pour une vérification précise → Historique salles.', { variant: 'success' });
        setNoteText('');
        if (technicians.length > 0) setAssignedTechnicianId(technicians[0].id);
      } else {
        let msg = 'Erreur enregistrement';
        try {
          const d = await res.json();
          if (d?.message) msg = d.message;
        } catch { /* ignore */ }
        enqueueSnackbar(msg, { variant: 'error' });
      }
    } catch { enqueueSnackbar('Erreur réseau', { variant: 'error' }); }
    finally { setSaving(false); }
  };

  /* ── derive final analysis ── */
  const localFallback = calcLocalRisk(verifications);
  const comments = extractComments(verifications);

  // When AI is active → use AI's semantic count; when fallback → use local keyword count
  const issues = aiResult?.issues ?? comments.filter(c => hasIssue(c.text) || !c.completed).length;
  const total = aiResult?.total ?? comments.length;

  const result = {
    ...(aiResult || localFallback),
    issues,
    total,
    maintenance: aiResult?.maintenance || localFallback.maintenance,

  };

  const riskColor = result.risk >= 60 ? '#e53935' : result.risk >= 30 ? '#ffab00' : '#00e676';
  const predColor = (result.predictedRisk ?? result.risk) >= 60 ? '#e53935' : (result.predictedRisk ?? result.risk) >= 30 ? '#ffab00' : '#00e676';
  const trendLabel = result.trend === 'hausse' ? '↑ En hausse' : result.trend === 'baisse' ? '↓ En baisse' : '→ Stable';
  const trendClass = result.trend === 'hausse' ? 'rra-badge-hausse' : result.trend === 'baisse' ? 'rra-badge-baisse' : 'rra-badge-stable';

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}><CircularProgress /></Box>;

  return (
    <Box className="ind-page">

        {/* Header */}
        <div className="ind-page-header">
          <div>
            <div className="ind-page-title">Analyse de risque</div>
           
          </div>
          <div className="ind-header-actions ind-select-wrap">
            <FormControl size="small">
              <InputLabel>Salle</InputLabel>
              <Select value={selectedRoomId} label="Salle" onChange={e => setSelectedRoomId(e.target.value)}>
                {rooms.map(r => <MenuItem key={r._id || r.id} value={r._id || r.id}>{r.name}</MenuItem>)}
              </Select>
            </FormControl>
          </div>
        </div>

        {/* AI loading */}
        {aiLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, p: '10px 16px', background: '#0d1a2a', borderRadius: 2, border: '1px solid #1a3a5a' }}>
            <CircularProgress size={16} sx={{ color: '#4a90e2' }} />
            <Typography sx={{ fontFamily: 'Share Tech Mono', fontSize: 12, color: '#4a90e2' }}>Analyse IA en cours…</Typography>
          </Box>
        )}

        {/* KPI cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>

          {/* Risque actuel */}
          <Grid item xs={12} sm={6} md={3}>
            <div className="ind-risk-card" style={{ '--card-accent': riskColor, textAlign: 'center' }}>
              <div className="ind-risk-label">Risque actuel</div>
              <RiskGauge value={result.risk} label="État actuel" color={riskColor} />
              <Chip label={result.state} className={result.state === 'Normal' ? 'rra-badge-normal' : 'rra-badge-anormal'}
                size="small" sx={{ fontFamily: 'Share Tech Mono', fontSize: 11, mt: 0.5 }} />
            </div>
          </Grid>

          {/* Risque prédit */}
          <Grid item xs={12} sm={6} md={3}>
            <div className="ind-risk-card" style={{ '--card-accent': predColor, textAlign: 'center' }}>
              <div className="ind-risk-label">Risque prédit</div>
              <RiskGauge value={result.predictedRisk ?? result.risk} label="État futur estimé" color={predColor} />
              <Chip label={trendLabel} className={trendClass}
                size="small" sx={{ fontFamily: 'Share Tech Mono', fontSize: 11, mt: 0.5 }} />
            </div>
          </Grid>

          {/* Commentaires analysés — dynamique */}
          <Grid item xs={12} sm={6} md={3}>
            <div className="ind-risk-card" style={{ '--card-accent': result.issues > 0 ? '#e53935' : '#00e676' }}>
              <div className="ind-risk-label">Commentaires analysés</div>
              <div className="ind-risk-value" style={{ color: result.issues > 0 ? '#e53935' : '#00e676' }}>
                {result.issues}
              </div>
              <div className="ind-risk-desc">alerte{result.issues !== 1 ? 's' : ''} sur {result.total} commentaire{result.total !== 1 ? 's' : ''}</div>
              <div className="ind-risk-desc" style={{ marginTop: 8, fontSize: 11 }}>{result.reason}</div>
              {result.note && (
                <Typography sx={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#2a5a8a', mt: 1 }}>{result.note}</Typography>
              )}
            </div>
          </Grid>

          {/* Maintenance recommendation */}
          <Grid item xs={12} sm={6} md={3}>
            <div className="ind-risk-card" style={{ '--card-accent': '#0096ff' }}>
              <div className="ind-risk-label">Recommandation maintenance</div>
              {result.maintenance ? (
                <>
                  <div className="ind-risk-value" style={{ color: PRIORITY_COLOR[result.maintenance.priority] || '#0096ff', fontSize: 22 }}>
                    {result.maintenance.priority}
                  </div>
                  <div className="ind-risk-desc">🔧 {result.maintenance.action}</div>
                  <div className="ind-risk-desc" style={{ marginTop: 4, fontSize: 11 }}>{result.maintenance.details}</div>
                </>
              ) : (
                <div className="ind-risk-desc">Calcul en cours…</div>
              )}
            </div>
          </Grid>
        </Grid>

        {/* Alertes IA */}
        {(result.alerts || []).length > 0 && (
          <Paper sx={{ mb: 3, background: '#0a0f18', border: '1px solid #2a0a0a' }}>
            <Box sx={{ p: '10px 16px', borderBottom: '1px solid #1a0a0a', display: 'flex', alignItems: 'center', gap: 1 }}>
              <div style={{ width: 3, height: 16, background: '#e53935' }} />
              <Typography sx={{ fontFamily: 'Barlow Condensed', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#fff' }}>
                Points critiques détectés
              </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              {result.alerts.map((alert, i) => (
                <div key={i} className="rra-alert-item">
                  <span style={{ fontSize: 14 }}>⚠️</span>
                  <span className="rra-alert-text">{alert}</span>
                </div>
              ))}
            </Box>
          </Paper>
        )}

        {/* Admin — Décision maintenance */}
        {isAdmin && (
          <Paper sx={{ mb: 3, background: '#0a1520', border: '1px solid #1a3a5a' }}>
            <Box sx={{ p: '10px 16px', borderBottom: '1px solid #1a2a3a', display: 'flex', alignItems: 'center', gap: 1 }}>
              <div style={{ width: 3, height: 16, background: '#4a90e2' }} />
              <Typography sx={{ fontFamily: 'Barlow Condensed', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#fff' }}>
                Décision de maintenance (Admin)
              </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontFamily: 'Share Tech Mono', fontSize: 11, color: '#5a7a9a', mb: 2 }}>
                Décision liée à <strong>une vérification</strong> : page <strong>Historique salles</strong>, colonne « Décision maintenance ».
                Ici : remarque globale pour la salle (sans ligne de vérification).
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel sx={{ fontSize: 12 }}>Priorité</InputLabel>
                    <Select value={notePriority} label="Priorité" onChange={e => setNotePriority(e.target.value)}
                      sx={{ fontSize: 12, background: '#0d1117' }}>
                      {['Faible', 'Moyenne', 'Haute', 'Critique'].map(p => (
                        <MenuItem key={p} value={p} sx={{ fontSize: 12 }}>{p}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 210 }}>
                    <InputLabel sx={{ fontSize: 12 }}>Technicien assigné</InputLabel>
                    <Select
                      value={assignedTechnicianId}
                      label="Technicien assigné"
                      onChange={e => setAssignedTechnicianId(e.target.value)}
                      sx={{ fontSize: 12, background: '#0d1117' }}
                    >
                      <MenuItem value="" sx={{ fontSize: 12 }}>Aucun</MenuItem>
                      {technicians.map(t => (
                        <MenuItem key={t.id} value={t.id} sx={{ fontSize: 12 }}>
                          {t.displayName || t.email}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography sx={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: '#3a5a7a', alignSelf: 'center' }}>
                    État actuel : {result.state} ({result.risk}%)
                  </Typography>
                </Box>
                <TextField
                  multiline minRows={2} maxRows={5}
                  placeholder="Saisir la décision ou remarque de maintenance…"
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  size="small"
                  sx={{ '& .MuiInputBase-root': { background: '#0d1117', fontSize: 13 } }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="contained" size="small" onClick={saveNote} disabled={saving || !noteText.trim()}
                    sx={{ background: '#1a3a6a', '&:hover': { background: '#2a5aaa' }, fontFamily: 'Share Tech Mono', fontSize: 11 }}>
                    {saving ? 'Enregistrement…' : '💾 Enregistrer la décision'}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Paper>
        )}

        {/* Historique commentaires checklist */}
        <Paper sx={{ background: '#0d1117', border: '1px solid #1a2233' }}>
          <Box sx={{ p: '10px 16px', borderBottom: '1px solid #161c26', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 3, height: 16, background: '#ff6f00' }} />
              <Typography sx={{ fontFamily: 'Barlow Condensed', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#fff' }}>
                Commentaires de vérification checklist
              </Typography>
            </div>
            <Typography sx={{ fontFamily: 'Share Tech Mono', fontSize: 11, color: '#3a5a7a' }}>
              {comments.length} commentaire{comments.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <List sx={{ p: 0, px: 2 }}>
            {comments.length === 0 ? (
              <ListItem>
                <Typography sx={{ fontFamily: 'Share Tech Mono', fontSize: 11, color: '#2a3a4a', py: 2 }}>
                  Aucun commentaire de vérification pour cette salle.
                </Typography>
              </ListItem>
            ) : (
              [...comments]
                .sort((a, b) => new Date(b.verif?.createdAt) - new Date(a.verif?.createdAt))
                .map((c, i) => {
                  const isAlert = hasIssue(c.text) || !c.completed;
                  return (
                    <ListItem 
                      key={i} 
                      className={`rra-comment-item rra-comment-item-clickable`}
                      alignItems="flex-start"
                      onClick={() => setSelectedComment(c)}
                      title="Cliquez pour voir la photo"
                      sx={{ borderLeft: isAlert ? '3px solid #e53935' : '3px solid transparent', pl: 1.5 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span className="rra-comment-date">{c.date}</span>
                            {isAlert && <Chip label="Alerte" size="small" sx={{ height: 16, fontSize: 9, background: '#3a0a0a', color: '#ef5350', border: '1px solid #c62828', fontFamily: 'Share Tech Mono' }} />}
                            {!c.completed && <Chip label="Non complété" size="small" sx={{ height: 16, fontSize: 9, background: '#2a1a00', color: '#ffab00', border: '1px solid #e65100', fontFamily: 'Share Tech Mono' }} />}
                          </Box>
                        }
                        secondary={
                          <>
                            <span className="rra-comment-label">{c.label}</span><br />
                            <span className="rra-comment-text">{c.text}</span><br />
                            <span className="rra-comment-author">Technicien: {c.tech}</span>
                          </>
                        }
                      />
                    </ListItem>
                  );
                })
            )}
          </List>
        </Paper>

        {/* ✅ MODALE: Détails de commentaire avec images */}
        {selectedComment && (
          <div className="rra-modal-overlay" onClick={() => setSelectedComment(null)}>
            <div className="rra-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="rra-modal-header">
                <div className="rra-modal-title">Détails du commentaire</div>
                <button className="rra-modal-close" onClick={() => setSelectedComment(null)}>✕</button>
              </div>

              <div className="rra-detail-section">
                <div className="rra-detail-row">
                  <span className="rra-detail-label">Élément</span>
                  <span className="rra-detail-value">{selectedComment.label}</span>
                </div>
                <div className="rra-detail-row">
                  <span className="rra-detail-label">Technicien</span>
                  <span className="rra-detail-value">{selectedComment.tech}</span>
                </div>
                <div className="rra-detail-row">
                  <span className="rra-detail-label">Date</span>
                  <span className="rra-detail-value">{selectedComment.date}</span>
                </div>
                <div className="rra-detail-row">
                  <span className="rra-detail-label">Statut</span>
                  <span className="rra-detail-value">
                    <span style={{ color: selectedComment.completed ? '#00e676' : '#e53935' }}>
                      {selectedComment.completed ? '✓ COMPLÉTÉ' : '✗ NON COMPLÉTÉ'}
                    </span>
                  </span>
                </div>
              </div>

              <div style={{
                background: 'rgba(255, 111, 0, 0.05)',
                border: '1px solid #1e2a38',
                padding: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: 13, color: '#7a9aba', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Commentaire
                </div>
                <div style={{ fontSize: 15, color: '#e8f1fa', lineHeight: 1.6, wordBreak: 'break-word' }}>
                  {selectedComment.text}
                </div>
              </div>

              {/* Afficher la photo de cet item spécifique */}
              {selectedComment.verif?.items && selectedComment.verif.items.length > 0 && (
                <div className="rra-items-container">
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 16,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#ffffff',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <span style={{ width: 3, height: 18, background: '#ff6f00' }} />
                    Photo capturée
                  </div>

                  {selectedComment.verif.items
                    .filter(item => item.label === selectedComment.label)
                    .map((item, idx) => {
                      const photoSrc = getPhotoSrc(item.photo);
                      if (!photoSrc) {
                        return (
                          <div className="rra-item-block" key={idx}>
                            <div className="rra-no-image">📷 Aucune photo capturée</div>
                          </div>
                        );
                      }
                      return (
                        <div className="rra-item-block" key={idx}>
                          <img 
                            src={photoSrc}
                            alt={`Photo - ${item.label}`}
                            className="rra-item-image"
                            onLoad={() => {
                              console.log('✅ Image loaded successfully for:', item.label);
                            }}
                            onError={(e) => {
                              console.error('❌ Image load error for:', item.label);
                              console.error('Photo src starts with:', photoSrc?.substring(0, 80));
                              console.error('Photo length:', photoSrc?.length);
                              e.target.style.display = 'none';
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'rra-no-image';
                              errorDiv.textContent = '❌ Erreur lors du chargement de l\'image';
                              e.target.parentElement.appendChild(errorDiv);
                            }}
                          />
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </Box>

  );
  
}

import './RoomVerificationHistoryPage.css';
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Chip, Button, TextField
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { roomsAPI, verificationsAPI, aiAPI, authAPI, API_BASE } from '../../services/api';

/* ── helpers ── */
const KEYWORDS_ISSUE = [
  'mauvais','panne','défaillance','défaut','erreur','incident','anormal','problème',
  'non conforme','vide','bloqué','fuite','chauffe','bruit','alarme',
  'cassé','hors service','dégradé','dysfonctionnement',
  'température élevée','surchauffe','chaud','trop chaud','chaleur','température anormale',
  'humidité élevée','humidité anormale','trop humide','condensation','eau','infiltration',
  'climatisation','ventilation','clim','refroidissement','ventilateur','fan',
  'tension','voltage','onduleur','ups','court-circuit','surcharge','surtension',
  'accès non autorisé','intrusion','avertissement','urgent','critique','risque','danger'
];
function hasIssue(t = '') { return KEYWORDS_ISSUE.some(kw => t.toLowerCase().includes(kw)); }

function localStateForVerif(v) {
  const texts = [];
  if (v.notes || v.comment) texts.push(v.notes || v.comment);
  for (const item of (v.items || [])) {
    if (item.notes || item.comment) texts.push(item.notes || item.comment);
    if (item.required && !item.completed) texts.push('non complété');
  }
  if (!texts.length) return { state: 'Normal', risk: 5, color: '#00e676', bg: '#003520', border: '#00b050' };
  const issues = texts.filter(t => hasIssue(t)).length;
  const risk   = Math.min(100, Math.round((issues / texts.length) * 100));
  if (risk >= 60 || v.status === 'incomplete')
    return { state: 'Anormal',   risk, color:'#ef5350', bg:'#3a0a0a', border:'#c62828' };
  if (risk >= 30)
    return { state: 'Attention', risk, color:'#ffab00', bg:'#2a1800', border:'#e65100' };
  return { state: 'Normal', risk, color:'#00e676', bg:'#003520', border:'#00b050' };
}

const STATUS_COLOR = {
  validated: '#00e676', submitted: '#4a90e2',
  completed: '#00e676', incomplete: '#ef5350', draft: '#ffab00',
};
const PRIORITY_COLOR = { Critique:'#ef5350', Haute:'#ffab00', Moyenne:'#4a90e2', Faible:'#00e676' };

export default function RoomVerificationHistoryPage() {
  const [rooms,          setRooms]          = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [verifications,  setVerifications]  = useState([]);
  const [aiRoomState,    setAiRoomState]    = useState(null);
  const [maintenanceNotes, setMaintenanceNotes] = useState([]);
  const [myNotifications, setMyNotifications] = useState([]);
  const [statusLoadingId, setStatusLoadingId] = useState('');
  const [feedbackByNote, setFeedbackByNote] = useState({});
  const [aiLoading,      setAiLoading]      = useState(false);
  const [loading,        setLoading]        = useState(true);
  const { enqueueSnackbar } = useSnackbar();
  const currentUser = authAPI.getCurrentUser();
  const isTechnician = currentUser?.role === 'technicien';

  useEffect(() => { loadRooms(); }, []);
  useEffect(() => {
    if (selectedRoomId) {
      loadVerifications(selectedRoomId);
      loadAiState(selectedRoomId);
      loadMaintenanceNotes(selectedRoomId);
    }
  }, [selectedRoomId]);
  useEffect(() => {
    if (isTechnician) loadMyNotifications();
  }, [isTechnician]);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const loadRooms = async () => {
    try {
      setLoading(true);
      const data = await roomsAPI.getAll();
      setRooms(data);
      if (data.length > 0) setSelectedRoomId(data[0].id);
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.message || 'Erreur chargement salles', { variant: 'error' });
    } finally { setLoading(false); }
  };

  const loadVerifications = async (roomId) => {
    try {
      setLoading(true);
      const data = await verificationsAPI.getByRoom(roomId);
      setVerifications(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.message || 'Erreur chargement historique', { variant: 'error' });
      setVerifications([]);
    } finally { setLoading(false); }
  };

  const loadAiState = async (roomId) => {
    setAiLoading(true); setAiRoomState(null);
    try {
      const res = await fetch(`${API_BASE}/ai/room-risk`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ roomId }) });
      if (res.ok) setAiRoomState(await res.json());
    } catch (e) { console.error('AI error', e); }
    finally { setAiLoading(false); }
  };

  const loadMaintenanceNotes = async (roomId) => {
    try {
      const res = await fetch(`${API_BASE}/ai/maintenance-notes/${roomId}`, { headers: authHeaders() });
      if (res.ok) setMaintenanceNotes(await res.json());
    } catch { setMaintenanceNotes([]); }
  };

  const loadMyNotifications = async () => {
    try {
      const notes = await aiAPI.getMyMaintenanceNotifications();
      setMyNotifications(Array.isArray(notes) ? notes : []);
    } catch {
      setMyNotifications([]);
    }
  };

  const onTechnicianStatusChange = async (noteId, status) => {
    try {
      setStatusLoadingId(noteId);
      const feedback = (feedbackByNote[noteId] || '').trim();
      await aiAPI.updateMaintenanceStatus(noteId, { status, technicianFeedback: feedback });
      enqueueSnackbar('Statut maintenance mis à jour', { variant: 'success' });
      await Promise.all([
        loadMyNotifications(),
        selectedRoomId ? loadMaintenanceNotes(selectedRoomId) : Promise.resolve()
      ]);
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.message || 'Erreur mise à jour statut', { variant: 'error' });
    } finally {
      setStatusLoadingId('');
    }
  };

  if (loading) return (
    <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:400 }}>
      <CircularProgress />
    </Box>
  );

  const globalAiColor = aiRoomState
    ? (aiRoomState.risk >= 60 ? '#ef5350' : aiRoomState.risk >= 30 ? '#ffab00' : '#00e676')
    : null;

  // Map latest maintenance note per date (for quick lookup in table)
  const latestNote = maintenanceNotes[0] || null;

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:3, flexWrap:'wrap', gap:2 }}>
        <Box>
          <Typography variant="h4">Historique des vérifications par salle</Typography>


        </Box>

        <FormControl sx={{ minWidth:240 }} size="small">
          <InputLabel>Salle</InputLabel>
          <Select value={selectedRoomId} label="Salle" onChange={e => setSelectedRoomId(e.target.value)}>
            {rooms.map(r => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {/* ── Table ── */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Employé</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>État de la salle (IA)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {verifications.map(v => {
                const ls = localStateForVerif(v);
                const vDate = new Date(v.submittedAt || v.createdAt);

                return (
                  <TableRow key={v.id} hover>
                    <TableCell sx={{ fontFamily:'monospace', fontSize:13 }}>
                      {vDate.toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      {v.employee?.displayName || v.employee?.email || v.technician?.displayName || v.technician?.email || '—'}
                    </TableCell>
                    <TableCell>
                      <Chip label={v.status} size="small"
                        sx={{ fontFamily:'monospace', fontSize:11,
                          color: STATUS_COLOR[v.status] || '#90a4ae',
                          background: (STATUS_COLOR[v.status] || '#90a4ae') + '18',
                          border: `1px solid ${(STATUS_COLOR[v.status] || '#2a3a4a')}55` }} />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                        <Chip label={ls.state} size="small"
                          sx={{ fontFamily:'monospace', fontSize:11, color:ls.color, background:ls.bg, border:`1px solid ${ls.border}` }} />
                        <Typography sx={{ fontFamily:'monospace', fontSize:11, color:'#5a6a7a' }}>
                          {ls.risk}%
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
              {verifications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py:3 }}>
                      Aucune vérification trouvée pour cette salle
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {isTechnician && (
        <Paper sx={{ mt:3, background:'#0a1520', border:'1px solid #1a3a5a' }}>
          <Box sx={{ p:'10px 16px', borderBottom:'1px solid #1a2a3a', display:'flex', alignItems:'center', gap:1 }}>
            <div style={{ width:3, height:16, background:'#4a90e2' }} />
            <Typography sx={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:14, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'#fff' }}>
              Notifications maintenance (technicien)
            </Typography>
          </Box>
          <Box sx={{ p:2, display:'flex', flexDirection:'column', gap:1.5 }}>
            {myNotifications.length === 0 && (
              <Typography sx={{ fontFamily:'monospace', fontSize:11, color:'#5a6a7a' }}>
                Aucune décision de maintenance assignée.
              </Typography>
            )}
            {myNotifications.map(n => (
              <Paper key={n._id} sx={{ p:1.5, background:'#0d1117', border:'1px solid #1a2a3a' }}>
                <Typography sx={{ fontFamily:'monospace', fontSize:11, color:'#8fa2b5' }}>
                  Salle: {n.room?.name || '—'} · Admin: {n.admin?.displayName || n.admin?.email || '—'}
                </Typography>
                <Typography sx={{ fontSize:13, color:'#d7e1ea', mt:0.7, whiteSpace:'pre-wrap' }}>
                  {n.note}
                </Typography>
                <Box sx={{ mt:1.2, display:'flex', gap:1, flexWrap:'wrap', alignItems:'center' }}>
                  <FormControl size="small" sx={{ minWidth:160 }}>
                    <InputLabel>Statut</InputLabel>
                    <Select
                      label="Statut"
                      value={n.status || 'EN_ATTENTE'}
                      onChange={(e) => onTechnicianStatusChange(n._id, e.target.value)}
                      disabled={statusLoadingId === n._id}
                    >
                      <MenuItem value="EN_ATTENTE">En attente</MenuItem>
                      <MenuItem value="EN_COURS">En cours</MenuItem>
                      <MenuItem value="TERMINEE">Terminée</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    size="small"
                    placeholder="Retour technicien (optionnel)"
                    value={feedbackByNote[n._id] ?? n.technicianFeedback ?? ''}
                    onChange={(e) => setFeedbackByNote(prev => ({ ...prev, [n._id]: e.target.value }))}
                    sx={{ minWidth:260, flex:1 }}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onTechnicianStatusChange(n._id, n.status || 'EN_ATTENTE')}
                    disabled={statusLoadingId === n._id}
                  >
                    Enregistrer
                  </Button>
                </Box>
              </Paper>
            ))}
          </Box>
        </Paper>
      )}

      {/* ── Toutes les décisions admin ── */}
      {maintenanceNotes.length > 0 && (
        <Paper sx={{ mt:3, background:'#0a1520', border:'1px solid #1a3a5a' }}>
          <Box sx={{ p:'10px 16px', borderBottom:'1px solid #1a2a3a', display:'flex', alignItems:'center', gap:1 }}>
            <div style={{ width:3, height:16, background:'#4a90e2' }} />
            <Typography sx={{ fontFamily:'Barlow Condensed,sans-serif', fontSize:14, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'#fff' }}>
              Décisions maintenance enregistrées (récapitulatif)
            </Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontFamily:'monospace', fontSize:11 }}>Date</TableCell>
                <TableCell sx={{ fontFamily:'monospace', fontSize:11 }}>Admin</TableCell>
                <TableCell sx={{ fontFamily:'monospace', fontSize:11 }}>Technicien assigné</TableCell>
                <TableCell sx={{ fontFamily:'monospace', fontSize:11 }}>Statut</TableCell>
                <TableCell sx={{ fontFamily:'monospace', fontSize:11 }}>Décision maintenance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {maintenanceNotes.map(n => (
                <TableRow key={n._id} hover>
                  <TableCell sx={{ fontFamily:'monospace', fontSize:11, color:'#5a6a7a' }}>
                    {new Date(n.createdAt).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell sx={{ fontFamily:'monospace', fontSize:11 }}>
                    {n.admin?.displayName || n.admin?.email}
                  </TableCell>
                  <TableCell sx={{ fontFamily:'monospace', fontSize:11 }}>
                    {n.assignedTechnician?.displayName || n.assignedTechnician?.email || '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={n.status || 'EN_ATTENTE'}
                      size="small"
                      sx={{ fontFamily:'monospace', fontSize:10 }}
                      color={n.status === 'TERMINEE' ? 'success' : n.status === 'EN_COURS' ? 'warning' : 'default'}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize:13, color:'#1a1a2e', maxWidth:480, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                    {n.note}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}

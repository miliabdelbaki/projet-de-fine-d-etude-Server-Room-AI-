import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Paper, Select, MenuItem, FormControl, InputLabel, CircularProgress, Grid, Card, CardContent, List, ListItem, ListItemText } from '@mui/material';
import { useSnackbar } from 'notistack';
import { roomsAPI, verificationsAPI } from '../services/api';

const KEYWORDS_ISSUE = [
  'panne',
  'défaillance',
  'défaut',
  'erreur',
  'incident',
  'anormal',
  'problème',
  'non conforme',
  'vide',
  'bloqué',
  'fuite',
  'chauffe',
  'bruit',
];

function calculateRisk(verifications) {
  const flatComments = (verifications || []).map((v) => (v.notes || v.comment || '')).filter(Boolean);
  const total = flatComments.length;
  if (total === 0) return { risk: 0, state: 'Normal', reason: 'Pas de commentaires disponibles.' };

  const issues = flatComments.reduce((count, comment) => {
    const lower = comment.toLowerCase();
    if (KEYWORDS_ISSUE.some((kw) => lower.includes(kw))) return count + 1;
    return count;
  }, 0);

  const risk = Math.min(100, Math.round((issues / total) * 100));
  const state = issues > 0 ? 'Anormal' : 'Normal';
  const reason = state === 'Anormal'
    ? `Des commentaires comportent des mots clés d'alerte (${issues}/${total}).`
    : 'Aucun commentaire n’indique de problème évident.';

  return { risk, state, reason, issues, total };
}

export default function RoomRiskAnalysisPage() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    loadRooms();
  }, []);

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
      if (data.length > 0) setSelectedRoomId(data[0].id);
    } catch (error) {
      enqueueSnackbar('Erreur lors du chargement des salles', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadVerifications = async (roomId) => {
    try {
      setLoading(true);
      const data = await verificationsAPI.getByRoom(roomId);
      setVerifications(data);
    } catch (error) {
      console.error('RoomRiskAnalysisPage: loadVerifications', error);
      const message = error?.response?.data?.message || error?.message || 'Erreur lors du chargement des vérifications';
      enqueueSnackbar(message, { variant: 'error' });
      setVerifications([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAiAnalysis = async (roomId) => {
    try {
      const response = await fetch('/api/ai/room-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        const message = result?.message || 'Erreur lors de l’analyse AI';
        enqueueSnackbar(message, { variant: 'error' });
        setAiAnalysis(null);
        return;
      }

      const data = await response.json();
      if (data?.state && typeof data?.risk === 'number') {
        setAiAnalysis(data);
      } else {
        // Si la réponse n'est pas standard, ne pas exploiter en AI
        setAiAnalysis(null);
      }
    } catch (error) {
      console.error('RoomRiskAnalysisPage: loadAiAnalysis', error);
      const message = error?.message || 'Erreur lors de l’analyse AI';
      enqueueSnackbar(message, { variant: 'error' });
      setAiAnalysis(null);
    }
  };

  const [aiAnalysis, setAiAnalysis] = useState(null);
  const analysis = useMemo(() => {
    if (aiAnalysis) return aiAnalysis;
    return calculateRisk(verifications);
  }, [verifications, aiAnalysis]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Analyse de risque par salle</Typography>
        <FormControl sx={{ minWidth: 240 }} size="small">
          <InputLabel>Salle</InputLabel>
          <Select value={selectedRoomId} label="Salle" onChange={(e) => setSelectedRoomId(e.target.value)}>
            {rooms.map((room) => (
              <MenuItem key={room.id} value={room.id}>
                {room.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                État actuel estimé
              </Typography>
              <Typography variant="h4" sx={{ mt: 1 }}>
                {analysis.state}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {analysis.reason}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Risque estimé
              </Typography>
              <Typography variant="h4" sx={{ mt: 1 }}>
                {analysis.risk}%
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Basé sur {analysis.total} commentaire(s)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Commentaires préoccupants
              </Typography>
              <Typography variant="h4" sx={{ mt: 1 }}>
                {analysis.issues}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Mots-clés détectés
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Historique des commentaires
        </Typography>
        <List>
          {verifications.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Aucune vérification trouvée pour cette salle.
            </Typography>
          ) : (
            verifications
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((verification) => (
                <ListItem key={verification.id} alignItems="flex-start">
                  <ListItemText
                    primary={`${new Date(verification.submittedAt || verification.createdAt).toLocaleDateString('fr-FR')} — ${verification.technician?.displayName || verification.technician?.email || 'Technicien inconnu'}`}
                    secondary={verification.notes || verification.comment || 'Aucun commentaire'}
                  />
                </ListItem>
              ))
          )}
        </List>
      </Paper>
    </Box>
  );
}

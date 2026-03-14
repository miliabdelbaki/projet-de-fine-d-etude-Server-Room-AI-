import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, Checkbox } from '@mui/material';
import { Refresh, PlayArrow, CheckCircle } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { verificationsAPI, roomsAPI } from '../services/api';

export default function VerificationsPage() {
  const [verifications, setVerifications] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDialog, setStartDialog] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [verificationsData, roomsData] = await Promise.all([verificationsAPI.getAll(), roomsAPI.getAll()]);
      setVerifications(verificationsData.filter(v => v.status !== 'completed'));
      setRooms(roomsData);
    } catch (error) {
      enqueueSnackbar('Erreur lors du chargement', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStartVerification = async () => {
    if (!selectedRoom) return;
    try {
      await verificationsAPI.startForRoom(selectedRoom);
      enqueueSnackbar('Vérification démarrée', { variant: 'success' });
      setStartDialog(false);
      setSelectedRoom('');
      loadData();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.message || 'Erreur lors du démarrage', { variant: 'error' });
    }
  };

  const handleComplete = async (id) => {
    if (!window.confirm('Marquer cette vérification comme terminée ?')) return;
    try {
      await verificationsAPI.complete(id);
      enqueueSnackbar('Vérification terminée', { variant: 'success' });
      loadData();
    } catch (error) {
      enqueueSnackbar('Erreur', { variant: 'error' });
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Vérifications en cours</Typography>
        <Box>
          <Button variant="outlined" startIcon={<Refresh />} onClick={loadData} sx={{ mr: 1 }}>Actualiser</Button>
          <Button variant="contained" startIcon={<PlayArrow />} onClick={() => setStartDialog(true)}>Démarrer une vérification</Button>
        </Box>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Salle</TableCell>
                <TableCell>Checklist</TableCell>
                <TableCell>Technicien</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Démarrée le</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {verifications.map((verification) => (
                <TableRow key={verification.id}>
                  <TableCell><Typography sx={{ fontWeight: 'bold' }}>{verification.room?.name || 'Salle inconnue'}</Typography></TableCell>
                  <TableCell>{verification.checklist?.name || '-'}</TableCell>
                  <TableCell>{verification.technician?.displayName || verification.technician?.email || '-'}</TableCell>
                  <TableCell>
                    <Chip label={verification.status === 'completed' ? 'Complétée' : 'En cours'} color={verification.status === 'completed' ? 'success' : 'warning'} size="small" />
                  </TableCell>
                  <TableCell>{new Date(verification.verifiedAt || verification.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell align="right">
                    {verification.status !== 'completed' && (
                      <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => handleComplete(verification.id)}>Terminer</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {verifications.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center"><Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>Aucune vérification en cours</Typography></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={startDialog} onClose={() => setStartDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Démarrer une vérification</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Sélectionnez une salle pour démarrer une nouvelle vérification</Typography>
          <List>
            {rooms.map((room) => (
              <ListItem key={room.id} button selected={selectedRoom === room.id} onClick={() => setSelectedRoom(room.id)}>
                <Checkbox checked={selectedRoom === room.id} />
                <ListItemText primary={room.name} secondary={room.checklist ? `Checklist: ${room.checklist.name}` : 'Aucune checklist'} />
              </ListItem>
            ))}
            {rooms.length === 0 && <Typography variant="caption" color="text.secondary">Aucune salle disponible</Typography>}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStartDialog(false)}>Annuler</Button>
          <Button onClick={handleStartVerification} variant="contained" disabled={!selectedRoom}>Démarrer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
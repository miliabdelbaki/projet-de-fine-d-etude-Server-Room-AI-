import './RoomsPage.css';
import React, { useState, useEffect } from 'react';


import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, CircularProgress, Chip, Typography
} from '@mui/material';
import { Add, Edit, Delete, Refresh } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { roomsAPI, checklistsAPI } from '../../services/api';

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, mode: 'create', room: null });
  const [formData, setFormData] = useState({ name: '', description: '', checklist: '' });
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [roomsData, checklistsData] = await Promise.all([roomsAPI.getAll(), checklistsAPI.getAll()]);
      setRooms(roomsData);
      setChecklists(checklistsData);
    } catch { enqueueSnackbar('Erreur lors du chargement', { variant: 'error' }); }
    finally { setLoading(false); }
  };

  const handleOpenDialog = (mode, room = null) => {
    if (mode === 'edit' && room) {
      setFormData({ name: room.name, description: room.description || '', checklist: room.checklist?._id || '' });
    } else {
      setFormData({ name: '', description: '', checklist: '' });
    }
    setDialog({ open: true, mode, room });
  };

  const handleCloseDialog = () => {
    setDialog({ open: false, mode: 'create', room: null });
    setFormData({ name: '', description: '', checklist: '' });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name.trim()) {
        enqueueSnackbar('Veuillez saisir une désignation', { variant: 'warning' });
        return;
      }
      if (!formData.checklist) {
        enqueueSnackbar('Une checklist est obligatoire pour créer une salle', { variant: 'warning' });
        return;
      }
      const payload = { name: formData.name, description: formData.description, checklist: formData.checklist };
      if (dialog.mode === 'create') { await roomsAPI.create(payload); enqueueSnackbar('Salle créée', { variant: 'success' }); }
      else { await roomsAPI.update(dialog.room.id, payload); enqueueSnackbar('Salle modifiée', { variant: 'success' }); }
      handleCloseDialog(); loadData();
    } catch (e) { enqueueSnackbar(e.response?.data?.message || 'Erreur lors de la sauvegarde', { variant: 'error' }); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette salle ?')) return;
    try {
      await roomsAPI.delete(id); enqueueSnackbar('Salle supprimée', { variant: 'success' }); loadData();
    } catch { enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' }); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}><CircularProgress /></Box>;

  return (
    <>
            <Box className="ind-page">
        <div className="ind-page-header">
          <div>
            <div className="ind-page-title">Salles Serveurs</div>
            
          </div>
          <div className="ind-header-actions">
            <Button variant="outlined" startIcon={<Refresh />} onClick={loadData} size="small">Actualiser</Button>
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog('create')} size="small">Nouvelle Salle</Button>
          </div>
        </div>

        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Désignation</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Checklist</TableCell>
                  <TableCell>Techniciens</TableCell>
                  <TableCell>Création</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, color: '#fff', fontFamily: 'Barlow Condensed', fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {room.name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#5a6a7a', fontSize: 12 }}>{room.description || '—'}</TableCell>
                    <TableCell>
                      {room.checklist
                        ? <Chip label={room.checklist.name} size="small" color="primary" />
                        : <Typography variant="caption" sx={{ color: '#2a3a4a', fontFamily: 'Share Tech Mono', fontSize: 10 }}>AUCUNE</Typography>
                      }
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'Share Tech Mono', fontSize: 11, color: '#3a4a5a' }}>
                      {room.technicians?.length || 0} tech.
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'Share Tech Mono', fontSize: 11, color: '#3a4a5a' }}>
                      {new Date(room.createdAt).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenDialog('edit', room)}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(room.id)}><Delete fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {rooms.length === 0 && (
                  <TableRow className="ind-empty-row"><TableCell colSpan={6}>— Aucune salle enregistrée —</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Dialog open={dialog.open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{dialog.mode === 'create' ? 'Nouvelle Salle' : 'Modifier la Salle'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField fullWidth label="Désignation" value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Description" value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })} multiline rows={3} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth select label="Checklist associée *" value={formData.checklist}
                  onChange={e => setFormData({ ...formData, checklist: e.target.value })} SelectProps={{ native: true }} required error={!formData.checklist}>
                  <option value="">-- Sélectionner une checklist --</option>
                  {checklists.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </TextField>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Annuler</Button>
            <Button onClick={handleSubmit} variant="contained" disabled={!formData.name || !formData.checklist}>
              {dialog.mode === 'create' ? 'Créer' : 'Modifier'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}

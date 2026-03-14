import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, CircularProgress, Chip
} from '@mui/material';
import { Add, Edit, Delete, Refresh, Visibility } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { roomsAPI, checklistsAPI } from '../services/api';

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, mode: 'create', room: null });
  const [formData, setFormData] = useState({ name: '', description: '', checklist: '' });
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [roomsData, checklistsData] = await Promise.all([
        roomsAPI.getAll(),
        checklistsAPI.getAll(),
      ]);
      setRooms(roomsData);
      setChecklists(checklistsData);
    } catch (error) {
      enqueueSnackbar('Erreur lors du chargement', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (mode, room = null) => {
    if (mode === 'edit' && room) {
      setFormData({
        name: room.name,
        description: room.description || '',
        checklist: room.checklist?._id || '',
      });
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
      const payload = {
        name: formData.name,
        description: formData.description,
        checklist: formData.checklist || null,
      };

      if (dialog.mode === 'create') {
        await roomsAPI.create(payload);
        enqueueSnackbar('Salle créée avec succès', { variant: 'success' });
      } else {
        await roomsAPI.update(dialog.room.id, payload);
        enqueueSnackbar('Salle modifiée avec succès', { variant: 'success' });
      }
      
      handleCloseDialog();
      loadData();
    } catch (error) {
      enqueueSnackbar('Erreur lors de la sauvegarde', { variant: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette salle ?')) return;
    
    try {
      await roomsAPI.delete(id);
      enqueueSnackbar('Salle supprimée', { variant: 'success' });
      loadData();
    } catch (error) {
      enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Salles Serveurs</Typography>
        <Box>
          <Button variant="outlined" startIcon={<Refresh />} onClick={loadData} sx={{ mr: 1 }}>
            Actualiser
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog('create')}>
            Nouvelle Salle
          </Button>
        </Box>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Checklist</TableCell>
                <TableCell>Techniciens</TableCell>
                <TableCell>Créée le</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {room.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{room.description || '-'}</TableCell>
                  <TableCell>
                    {room.checklist ? (
                      <Chip label={room.checklist.name} size="small" color="primary" />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Aucune
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {room.technicians?.length || 0} technicien(s)
                  </TableCell>
                  <TableCell>
                    {new Date(room.createdAt).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpenDialog('edit', room)}>
                      <Edit />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(room.id)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {rooms.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                      Aucune salle. Cliquez sur "Nouvelle Salle" pour commencer.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog Créer/Modifier */}
      <Dialog open={dialog.open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialog.mode === 'create' ? 'Nouvelle Salle' : 'Modifier la Salle'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nom de la salle"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Checklist"
                value={formData.checklist}
                onChange={(e) => setFormData({ ...formData, checklist: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="">Aucune</option>
                {checklists.map((checklist) => (
                  <option key={checklist.id} value={checklist.id}>
                    {checklist.name}
                  </option>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.name}>
            {dialog.mode === 'create' ? 'Créer' : 'Modifier'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
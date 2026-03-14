import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, List, ListItem, ListItemText, Chip, CircularProgress } from '@mui/material';
import { Add, Edit, Delete, Refresh, AddCircle, RemoveCircle } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { checklistsAPI } from '../services/api';

export default function ChecklistsPage() {
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, mode: 'create', checklist: null });
  const [formData, setFormData] = useState({ name: '', description: '', items: [] });
  const [newItem, setNewItem] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => { loadChecklists(); }, []);

  const loadChecklists = async () => {
    try {
      setLoading(true);
      const data = await checklistsAPI.getAll();
      setChecklists(data);
    } catch (error) {
      enqueueSnackbar('Erreur lors du chargement', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (mode, checklist = null) => {
    if (mode === 'edit' && checklist) {
      setFormData({ name: checklist.name, description: checklist.description || '', items: checklist.items || [] });
    } else {
      setFormData({ name: '', description: '', items: [] });
    }
    setDialog({ open: true, mode, checklist });
  };

  const handleCloseDialog = () => {
    setDialog({ open: false, mode: 'create', checklist: null });
    setFormData({ name: '', description: '', items: [] });
    setNewItem('');
  };

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    setFormData({ ...formData, items: [...formData.items, { label: newItem, required: false, order: formData.items.length }] });
    setNewItem('');
  };

  const handleRemoveItem = (index) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const handleSubmit = async () => {
    try {
      const payload = { name: formData.name, description: formData.description, items: formData.items };
      if (dialog.mode === 'create') {
        await checklistsAPI.create(payload);
        enqueueSnackbar('Checklist créée', { variant: 'success' });
      } else {
        await checklistsAPI.update(dialog.checklist.id, payload);
        enqueueSnackbar('Checklist modifiée', { variant: 'success' });
      }
      handleCloseDialog();
      loadChecklists();
    } catch (error) {
      enqueueSnackbar('Erreur lors de la sauvegarde', { variant: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette checklist ?')) return;
    try {
      await checklistsAPI.delete(id);
      enqueueSnackbar('Checklist supprimée', { variant: 'success' });
      loadChecklists();
    } catch (error) {
      enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Checklists</Typography>
        <Box>
          <Button variant="outlined" startIcon={<Refresh />} onClick={loadChecklists} sx={{ mr: 1 }}>Actualiser</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog('create')}>Nouvelle Checklist</Button>
        </Box>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Créée le</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {checklists.map((checklist) => (
                <TableRow key={checklist.id}>
                  <TableCell><Typography variant="body1" sx={{ fontWeight: 'bold' }}>{checklist.name}</Typography></TableCell>
                  <TableCell>{checklist.description || '-'}</TableCell>
                  <TableCell><Chip label={`${checklist.items?.length || 0} items`} size="small" /></TableCell>
                  <TableCell>{new Date(checklist.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpenDialog('edit', checklist)}><Edit /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(checklist.id)}><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {checklists.length === 0 && (
                <TableRow><TableCell colSpan={5} align="center"><Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>Aucune checklist</Typography></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialog.open} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{dialog.mode === 'create' ? 'Nouvelle Checklist' : 'Modifier la Checklist'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Nom" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} multiline rows={2} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>Items de vérification</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField fullWidth size="small" label="Nouvel item" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddItem()} />
                <Button variant="contained" onClick={handleAddItem} startIcon={<AddCircle />}>Ajouter</Button>
              </Box>
              <List>
                {formData.items.map((item, index) => (
                  <ListItem key={index} secondaryAction={<IconButton edge="end" onClick={() => handleRemoveItem(index)}><RemoveCircle /></IconButton>}>
                    <ListItemText primary={item.label} secondary={`Ordre: ${index + 1}`} />
                  </ListItem>
                ))}
                {formData.items.length === 0 && <Typography variant="caption" color="text.secondary">Aucun item</Typography>}
              </List>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.name || formData.items.length === 0}>{dialog.mode === 'create' ? 'Créer' : 'Modifier'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
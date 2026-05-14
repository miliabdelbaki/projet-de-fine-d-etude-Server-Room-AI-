import './ChecklistsPage.css';
// ═══════════════════════════════════════════
//  ChecklistsPage.js — Industrial Design
// ═══════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, List, ListItem, ListItemText, Chip, CircularProgress, Typography } from '@mui/material';
import { Add, Edit, Delete, Refresh, AddCircle, RemoveCircle } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { checklistsAPI } from '../../services/api';

export default function ChecklistsPage() {
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, mode: 'create', checklist: null });
  const [formData, setFormData] = useState({ name: '', description: '', items: [] });
  const [newItem, setNewItem] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => { loadChecklists(); }, []);

  const loadChecklists = async () => {
    try { setLoading(true); setChecklists(await checklistsAPI.getAll()); }
    catch { enqueueSnackbar('Erreur de chargement', { variant: 'error' }); }
    finally { setLoading(false); }
  };

  const handleOpenDialog = (mode, checklist = null) => {
    if (mode === 'edit' && checklist) setFormData({ name: checklist.name, description: checklist.description || '', items: checklist.items || [] });
    else setFormData({ name: '', description: '', items: [] });
    setDialog({ open: true, mode, checklist });
  };

  const handleCloseDialog = () => { setDialog({ open: false, mode: 'create', checklist: null }); setNewItem(''); };

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    setFormData({ ...formData, items: [...formData.items, { label: newItem, required: false, order: formData.items.length }] });
    setNewItem('');
  };

  const handleSubmit = async () => {
    try {
      const payload = { name: formData.name, description: formData.description, items: formData.items };
      if (dialog.mode === 'create') { await checklistsAPI.create(payload); enqueueSnackbar('Checklist créée', { variant: 'success' }); }
      else { await checklistsAPI.update(dialog.checklist.id, payload); enqueueSnackbar('Checklist modifiée', { variant: 'success' }); }
      handleCloseDialog(); loadChecklists();
    } catch { enqueueSnackbar('Erreur de sauvegarde', { variant: 'error' }); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette checklist ?')) return;
    try { await checklistsAPI.delete(id); enqueueSnackbar('Supprimée', { variant: 'success' }); loadChecklists(); }
    catch { enqueueSnackbar('Erreur', { variant: 'error' }); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}><CircularProgress /></Box>;

  return (
    <>
            <Box className="ind-page">
        <div className="ind-page-header">
          <div>
            <div className="ind-page-title">Checklists</div>
            
          </div>
          <div className="ind-header-actions">
            <Button variant="outlined" startIcon={<Refresh />} onClick={loadChecklists} size="small">Actualiser</Button>
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog('create')} size="small">Nouvelle</Button>
          </div>
        </div>

        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Protocole</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Points de contrôle</TableCell>
                  <TableCell>Création</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {checklists.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, color: '#fff', fontFamily: 'Barlow Condensed', fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {c.name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#5a6a7a', fontSize: 12 }}>{c.description || '—'}</TableCell>
                    <TableCell><Chip label={`${c.items?.length || 0} points`} size="small" /></TableCell>
                    <TableCell sx={{ fontFamily: 'Share Tech Mono', fontSize: 11, color: '#3a4a5a' }}>
                      {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenDialog('edit', c)}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(c.id)}><Delete fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {checklists.length === 0 && (
                  <TableRow className="ind-empty-row"><TableCell colSpan={5}>— Aucun protocole —</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Dialog open={dialog.open} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>{dialog.mode === 'create' ? 'Nouveau Protocole' : 'Modifier le Protocole'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField fullWidth label="Nom du protocole" value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Description" value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })} multiline rows={2} />
              </Grid>
              <Grid item xs={12}>
                <Typography sx={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: '#ff6f00', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 1 }}>
                  Points de contrôle
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField fullWidth size="small" label="Nouveau point" value={newItem}
                    onChange={e => setNewItem(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleAddItem()} />
                  <Button variant="contained" onClick={handleAddItem} startIcon={<AddCircle />} size="small">Ajouter</Button>
                </Box>
                <List sx={{ background: '#0a0c0f', border: '1px solid #161c26', maxHeight: 200, overflow: 'auto' }}>
                  {formData.items.map((item, i) => (
                    <ListItem key={i} sx={{ borderBottom: '1px solid #161c26' }}
                      secondaryAction={<IconButton edge="end" size="small" onClick={() => setFormData({ ...formData, items: formData.items.filter((_, idx) => idx !== i) })}><RemoveCircle fontSize="small" /></IconButton>}>
                      <ListItemText
                        primary={<span style={{ fontSize: 13, color: '#c8d8e8' }}>{item.label}</span>}
                        secondary={<span style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#3a4a5a' }}>POINT #{i + 1}</span>}
                      />
                    </ListItem>
                  ))}
                  {formData.items.length === 0 && (
                    <ListItem><Typography sx={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: '#2a3a4a' }}>Aucun point de contrôle</Typography></ListItem>
                  )}
                </List>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Annuler</Button>
            <Button onClick={handleSubmit} variant="contained" disabled={!formData.name || formData.items.length === 0}>
              {dialog.mode === 'create' ? 'Créer' : 'Modifier'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}

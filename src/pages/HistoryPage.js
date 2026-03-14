import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Grid, Button, Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, Divider } from '@mui/material';
import { Refresh, Visibility } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { verificationsAPI } from '../services/api';

export default function HistoryPage() {
  const [verifications, setVerifications] = useState([]);
  const [filteredVerifications, setFilteredVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', startDate: '', endDate: '' });
  const [detailDialog, setDetailDialog] = useState({ open: false, verification: null });
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => { loadHistory(); }, []);

  useEffect(() => { applyFilters(); }, [verifications, filters]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await verificationsAPI.getAll();
      setVerifications(data.filter(v => v.status === 'completed'));
    } catch (error) {
      console.error('HistoryPage: loadHistory error', error);
      const message = error?.response?.data?.message || error?.message || 'Erreur lors du chargement';
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...verifications];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(v => 
        v.room?.name?.toLowerCase().includes(search) || 
        v.technician?.email?.toLowerCase().includes(search)
      );
    }

    if (filters.startDate) {
      filtered = filtered.filter(v => new Date(v.verifiedAt || v.createdAt) >= new Date(filters.startDate));
    }

    if (filters.endDate) {
      filtered = filtered.filter(v => new Date(v.verifiedAt || v.createdAt) <= new Date(filters.endDate));
    }

    setFilteredVerifications(filtered);
  };

  const handleViewDetail = (verification) => {
    setDetailDialog({ open: true, verification });
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Historique des vérifications</Typography>
        <Button variant="outlined" startIcon={<Refresh />} onClick={loadHistory}>Actualiser</Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField fullWidth size="small" label="Rechercher" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth size="small" type="date" label="Date début" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth size="small" type="date" label="Date fin" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} InputLabelProps={{ shrink: true }} />
          </Grid>
        </Grid>
      </Paper>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Salle</TableCell>
                <TableCell>Checklist</TableCell>
                <TableCell>Technicien</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Items</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredVerifications.map((verification) => (
                <TableRow key={verification.id}>
                  <TableCell><Typography sx={{ fontWeight: 'bold' }}>{verification.room?.name || 'Salle inconnue'}</Typography></TableCell>
                  <TableCell>{verification.checklist?.name || '-'}</TableCell>
                  <TableCell>{verification.technician?.displayName || verification.technician?.email || '-'}</TableCell>
                  <TableCell>{new Date(verification.verifiedAt || verification.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell>
                    <Chip label={`${verification.items?.filter(i => i.checked).length || 0}/${verification.items?.length || 0} complétés`} size="small" color="primary" />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" startIcon={<Visibility />} onClick={() => handleViewDetail(verification)}>Détail</Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredVerifications.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center"><Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>Aucune vérification trouvée</Typography></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={detailDialog.open} onClose={() => setDetailDialog({ open: false, verification: null })} maxWidth="md" fullWidth>
        <DialogTitle>Détail de la vérification</DialogTitle>
        <DialogContent>
          {detailDialog.verification && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}><Typography variant="body2" color="text.secondary">Salle</Typography><Typography variant="body1" sx={{ fontWeight: 'bold' }}>{detailDialog.verification.room?.name || '-'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2" color="text.secondary">Checklist</Typography><Typography variant="body1">{detailDialog.verification.checklist?.name || '-'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2" color="text.secondary">Technicien</Typography><Typography variant="body1">{detailDialog.verification.technician?.displayName || detailDialog.verification.technician?.email || '-'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2" color="text.secondary">Date</Typography><Typography variant="body1">{new Date(detailDialog.verification.verifiedAt || detailDialog.verification.createdAt).toLocaleString('fr-FR')}</Typography></Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Items vérifiés</Typography>
              <List>
                {detailDialog.verification.items?.map((item, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={item.label} secondary={item.comment || 'Aucun commentaire'} />
                    <Chip label={item.checked ? '✓ Vérifié' : '✗ Non vérifié'} color={item.checked ? 'success' : 'default'} size="small" />
                  </ListItem>
                )) || <Typography variant="caption" color="text.secondary">Aucun item</Typography>}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog({ open: false, verification: null })}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
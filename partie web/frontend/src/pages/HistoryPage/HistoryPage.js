import './HistoryPage.css';
// ═══════════════════════════════════════════
//  HistoryPage.js — Industrial Design
// ═══════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, Divider, Grid, TextField, Typography } from '@mui/material';
import { Refresh, Visibility } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { verificationsAPI } from '../../services/api';

export default function HistoryPage() {
  const [verifications, setVerifications] = useState([]);
  const [filtered, setFiltered] = useState([]);
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
      // Inclure 'submitted', 'validated' et 'completed'
      setVerifications(data.filter(v => ['submitted','validated','completed'].includes(v.status)));
    } catch (error) {
      enqueueSnackbar(error?.response?.data?.message || 'Erreur de chargement', { variant: 'error' });
    } finally { setLoading(false); }
  };

  const applyFilters = () => {
    let f = [...verifications];
    if (filters.search) {
      const s = filters.search.toLowerCase();
      f = f.filter(v => v.room?.name?.toLowerCase().includes(s) || v.technician?.email?.toLowerCase().includes(s));
    }
    if (filters.startDate) f = f.filter(v => new Date(v.verifiedAt || v.createdAt) >= new Date(filters.startDate));
    if (filters.endDate) f = f.filter(v => new Date(v.verifiedAt || v.createdAt) <= new Date(filters.endDate));
    setFiltered(f);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}><CircularProgress /></Box>;

  return (
    <>
            <Box className="ind-page">
        <div className="ind-page-header">
          <div>
            <div className="ind-page-title" style={{ color: "#fff" }}>Historique des vérifications</div>
            <div className="ind-page-subtitle">// Journal des opérations complétées</div>
          </div>
          <div className="ind-header-actions">
            <Button variant="outlined" startIcon={<Refresh />} onClick={loadHistory} size="small">Actualiser</Button>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="ind-filter-bar">
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" label="Rechercher salle / technicien"
                value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" type="date" label="Date début"
                value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" type="date" label="Date fin"
                value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
        </div>

        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Salle</TableCell>
                  <TableCell>Protocole</TableCell>
                  <TableCell>Opérateur</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Complétude</TableCell>
                  <TableCell align="right">Détail</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, color: '#fff', fontFamily: 'Barlow Condensed', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {v.room?.name || 'Inconnu'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#5a6a7a', fontSize: 12 }}>{v.checklist?.name || '—'}</TableCell>
                    <TableCell sx={{ fontFamily: 'Share Tech Mono', fontSize: 11, color: '#8a9aaa' }}>
                      {v.technician?.displayName || v.technician?.email || '—'}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'Share Tech Mono', fontSize: 11, color: '#3a4a5a' }}>
                      {new Date(v.verifiedAt || v.createdAt).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${v.items?.filter(i => i.completed).length || 0}/${v.items?.length || 0}`}
                        size="small" color="primary"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" startIcon={<Visibility />} onClick={() => setDetailDialog({ open: true, verification: v })}>
                        Voir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow className="ind-empty-row"><TableCell colSpan={6}>— Aucune vérification trouvée —</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Dialog open={detailDialog.open} onClose={() => setDetailDialog({ open: false, verification: null })} maxWidth="md" fullWidth>
          <DialogTitle>Rapport de vérification</DialogTitle>
          <DialogContent>
            {detailDialog.verification && (
              <Box>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {[
                    { key: 'Salle', val: detailDialog.verification.room?.name || '—' },
                    { key: 'Protocole', val: detailDialog.verification.checklist?.name || '—' },
                    { key: 'Opérateur', val: detailDialog.verification.technician?.displayName || detailDialog.verification.technician?.email || '—' },
                    { key: 'Date', val: new Date(detailDialog.verification.verifiedAt || detailDialog.verification.createdAt).toLocaleString('fr-FR') },
                  ].map(r => (
                    <Grid item xs={6} key={r.key}>
                      <Typography sx={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#3a4a5a', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 0.5 }}>
                        {r.key}
                      </Typography>
                      <Typography sx={{ fontFamily: 'Barlow Condensed', fontSize: 16, fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>
                        {r.val}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Typography sx={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: '#ff6f00', textTransform: 'uppercase', letterSpacing: '0.12em', mb: 1 }}>
                  Points de contrôle
                </Typography>
                <List sx={{ background: '#0a0c0f', border: '1px solid #161c26' }}>
                  {detailDialog.verification.items?.map((item, i) => (
                    <ListItem key={i} sx={{ borderBottom: '1px solid #161c26', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                      <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
                        <ListItemText
                          primary={<span style={{ fontSize: 13, color: '#c8d8e8' }}>{item.label}</span>}
                          secondary={<span style={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: '#3a4a5a' }}>{item.notes || item.comment || 'Aucun commentaire'}</span>}
                        />
                        <Chip label={item.completed ? '✓ OK' : '✗ NOK'} color={item.completed ? 'success' : 'default'} size="small" />
                      </Box>
                      {item.photo && (
                        <Box sx={{ width: '100%' }}>
                          <img
                            src={item.photo.startsWith('data:') ? item.photo : `data:image/jpeg;base64,${item.photo}`}
                            alt={`Photo ${item.label}`}
                            style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, border: '1px solid #1a3a5a' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </Box>
                      )}
                    </ListItem>
                  )) || <Typography sx={{ p: 2, color: '#3a4a5a', fontFamily: 'Share Tech Mono', fontSize: 11 }}>Aucun item</Typography>}
                </List>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialog({ open: false, verification: null })}>Fermer</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}
